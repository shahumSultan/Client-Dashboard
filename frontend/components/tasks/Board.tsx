"use client";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCardBody } from "@/components/tasks/parts";
import { useMoveTask } from "@/hooks/useTasks";
import { errorDetail } from "@/hooks/useEngagements";
import { cn } from "@/lib/utils";
import { TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskStatus } from "@/lib/types";

type Columns = Record<TaskStatus, string[]>;

function group(tasks: Task[]): Columns {
  const cols = Object.fromEntries(TASK_STATUSES.map((s) => [s, [] as string[]])) as Columns;
  // The server already orders by position.
  for (const t of tasks) cols[t.status].push(t.id);
  return cols;
}

const isColumn = (id: UniqueIdentifier): id is TaskStatus => (TASK_STATUSES as readonly string[]).includes(String(id));

function Card({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !task.can_edit,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      // The sortable attributes make the card a button; Enter opens it,
      // Space picks it up for a keyboard move.
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(task.id);
        else listeners?.onKeyDown?.(e);
      }}
      aria-label={`${task.title}${task.can_edit ? "" : " (read only)"}`}
      aria-roledescription={task.can_edit ? "draggable task" : "task"}
      className={cn(
        "glass block cursor-pointer select-none px-3.5 py-3 outline-none transition-colors",
        "hover:border-hairline-strong focus-visible:border-fg",
        task.can_edit && "touch-manipulation",
        isDragging && "opacity-30"
      )}
    >
      <TaskCardBody task={task} />
    </li>
  );
}

function Column({
  status, ids, byId, onOpen, onAdd,
}: {
  status: TaskStatus;
  ids: string[];
  byId: Map<string, Task>;
  onOpen: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      aria-label={TASK_STATUS_LABELS[status]}
      className="flex w-[17.5rem] shrink-0 flex-col lg:w-auto"
    >
      <header className="mb-2.5 flex items-center gap-2 px-1">
        <h2 className="text-sm font-medium text-fg">{TASK_STATUS_LABELS[status]}</h2>
        <span className="font-mono text-[11px] text-subtle">{ids.length}</span>
        <button
          type="button"
          onClick={() => onAdd(status)}
          aria-label={`New task in ${TASK_STATUS_LABELS[status]}`}
          className="ml-auto grid h-7 w-7 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </header>
      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn(
            "flex min-h-32 flex-1 flex-col gap-2 border border-dashed p-2 transition-colors",
            isOver ? "border-hairline-strong bg-tint" : "border-hairline"
          )}
        >
          {ids.map((id) => {
            const t = byId.get(id);
            return t ? <Card key={id} task={t} onOpen={onOpen} /> : null;
          })}
          {ids.length === 0 && (
            <li className="grid flex-1 place-items-center py-6 text-xs text-faint" aria-hidden="true">
              Nothing here
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

export function Board({
  tasks, onOpen, onAdd,
}: { tasks: Task[]; onOpen: (id: string) => void; onAdd: (status: TaskStatus) => void }) {
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const [columns, setColumns] = useState<Columns>(() => group(tasks));
  const [activeId, setActiveId] = useState<string | null>(null);
  const before = useRef<Columns | null>(null);
  const move = useMoveTask();

  // Follow the server, except mid-drag (a refetch must not yank the card);
  // a list that arrived during the drag is picked up once it ends.
  const [seen, setSeen] = useState(tasks);
  if (seen !== tasks && !activeId) {
    setSeen(tasks);
    setColumns(group(tasks));
  }

  const sensors = useSensors(
    // Mouse: a few pixels of travel before a drag starts, so a click still
    // opens the card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: press and hold to pick a card up, so a swipe still scrolls the
    // board sideways and the page down.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnOf = (id: UniqueIdentifier, cols: Columns): TaskStatus | null =>
    isColumn(id) ? id : (TASK_STATUSES.find((s) => cols[s].includes(String(id))) ?? null);

  const onDragStart = ({ active }: DragStartEvent) => {
    before.current = columns;
    setActiveId(String(active.id));
  };

  // Crossing into another column: move the card there now, so the target
  // column opens a gap under the pointer.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setColumns((cols) => {
      const from = columnOf(active.id, cols);
      const to = columnOf(over.id, cols);
      if (!from || !to || from === to) return cols;
      const id = String(active.id);
      const target = cols[to];
      const overIndex = isColumn(over.id) ? target.length : target.indexOf(String(over.id));
      return {
        ...cols,
        [from]: cols[from].filter((x) => x !== id),
        [to]: [...target.slice(0, overIndex), id, ...target.slice(overIndex)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const original = before.current ?? columns;
    setActiveId(null);
    if (!over) {
      setColumns(original);
      return;
    }
    const to = columnOf(over.id, columns);
    if (!to) {
      setColumns(original);
      return;
    }
    let list = columns[to];
    if (!isColumn(over.id) && over.id !== active.id) {
      list = arrayMove(list, list.indexOf(id), list.indexOf(String(over.id)));
    }
    const next = { ...columns, [to]: list };
    const index = list.indexOf(id);
    const afterId = index > 0 ? list[index - 1] : null;

    const fromBefore = columnOf(id, original);
    const oldList = fromBefore ? original[fromBefore] : [];
    const oldIndex = oldList.indexOf(id);
    const oldAfter = oldIndex > 0 ? oldList[oldIndex - 1] : null;
    if (fromBefore === to && oldAfter === afterId) {
      setColumns(original);
      return;
    }

    setColumns(next);
    move.mutate(
      { id, status: to, after_id: afterId },
      {
        onError: (e) => {
          setColumns(original);
          toast.error(errorDetail(e, "Couldn't move that task"));
        },
      }
    );
  };

  const active = activeId ? byId.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        if (before.current) setColumns(before.current);
      }}
    >
      {/* Four columns side by side on a wide screen; a horizontal swipe on a narrow one. */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {TASK_STATUSES.map((s) => (
          <div key={s} className="snap-start">
            <Column status={s} ids={columns[s]} byId={byId} onOpen={onOpen} onAdd={onAdd} />
          </div>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {active ? (
          <div className="glass-strong rotate-[1.5deg] px-3.5 py-3 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.85)]">
            <TaskCardBody task={active} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
