"""Uploaded agreement PDFs: checking them on the way in, certifying on the way out."""
import io
from datetime import timezone

from fpdf import FPDF
from pypdf import PdfReader, PdfWriter

from app.models.engagement import Engagement

MAX_PDF_BYTES = 10 * 1024 * 1024


class InvalidPdf(ValueError):
    pass


def inspect_pdf(data: bytes) -> int:
    """Return the page count, or raise InvalidPdf with a reason for the admin.

    The file is shown to a client and later merged with a certificate, so it
    has to be a PDF that actually opens — not merely one named .pdf.
    """
    if len(data) > MAX_PDF_BYTES:
        raise InvalidPdf("The PDF is larger than 10 MB. Export it again at a smaller size.")
    if not data.startswith(b"%PDF-"):
        raise InvalidPdf("That file isn't a PDF. Export your document as PDF and upload that.")
    try:
        reader = PdfReader(io.BytesIO(data))
        encrypted = reader.is_encrypted
        pages = 0 if encrypted else len(reader.pages)
    except Exception:
        # pypdf raises a spread of types on malformed input, not only
        # PdfReadError; any of them means the same thing to the admin.
        raise InvalidPdf("The PDF couldn't be read — it may be damaged. Export it again.")
    if encrypted:
        raise InvalidPdf("The PDF is password-protected. Upload a copy without a password.")
    if pages < 1:
        raise InvalidPdf("The PDF has no pages.")
    return pages


def _latin1(text: str) -> str:
    # The certificate uses the PDF core fonts, which cover Latin-1 only. Names
    # outside it degrade to "?" rather than failing the download.
    return text.encode("latin-1", "replace").decode("latin-1")


def _utc(dt) -> str:
    return dt.replace(tzinfo=timezone.utc).strftime("%d %B %Y, %H:%M:%S UTC")


def certificate_page(e: Engagement) -> bytes:
    """One page recording who signed what, when, and from where."""
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(False)
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(169, 46, 46)
    pdf.set_xy(20, 22)
    pdf.cell(0, 6, "ENIGMA-CUBE  -  SIGNATURE CERTIFICATE")

    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(13, 13, 13)
    pdf.set_xy(20, 32)
    pdf.cell(0, 10, _latin1(e.agreement_title))
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(87, 83, 78)
    pdf.set_xy(20, 43)
    pdf.cell(0, 6, _latin1(f"{e.project.name}  -  {e.project.organization.name}"))

    rows = [
        ("Document", e.document.filename),
        ("Pages", f"{e.document.page_count} (this certificate is appended as the final page)"),
        ("Document SHA-256", e.document.sha256),
        ("Agreement fingerprint", e.agreement_hash or ""),
        ("Issued by", f"Enigma-Cube{f' - {e.sender_name}' if e.sender_name else ''}"),
        ("Issued", _utc(e.sent_at) if e.sent_at else ""),
        ("Signed by", f"{e.signer_name}{f', {e.signer_title}' if e.signer_title else ''}"),
        ("Signer account", e.signer_email or ""),
        ("Signed", _utc(e.signed_at) if e.signed_at else ""),
        ("Signer IP address", e.signer_ip or "unknown"),
    ]

    y = 60
    pdf.set_draw_color(231, 229, 228)
    for label, value in rows:
        pdf.line(20, y, 190, y)
        pdf.set_xy(20, y + 3)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(120, 113, 108)
        pdf.cell(48, 5, label.upper())
        pdf.set_xy(68, y + 3)
        mono = "SHA-256" in label or "fingerprint" in label
        pdf.set_font("Courier" if mono else "Helvetica", "", 8 if mono else 10)
        pdf.set_text_color(13, 13, 13)
        pdf.multi_cell(122, 5, _latin1(value))
        y = max(pdf.get_y(), y + 11) + 2

    pdf.line(20, y, 190, y)
    pdf.set_xy(20, y + 8)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(87, 83, 78)
    pdf.multi_cell(170, 5, _latin1(
        "The signer reviewed the document above in the Enigma-Cube client portal, confirmed "
        "they were authorised to sign on behalf of the client, consented to sign electronically, "
        "and typed their full name as their signature. The document SHA-256 identifies the exact "
        "file signed: recomputing it over the preceding pages' original file will match only if "
        "that file is unchanged."
    ))
    return bytes(pdf.output())


def signed_copy(e: Engagement, original: bytes) -> bytes:
    """The client's document, untouched, with the certificate as a final page."""
    writer = PdfWriter()
    writer.append(PdfReader(io.BytesIO(original)))
    writer.append(PdfReader(io.BytesIO(certificate_page(e))))
    writer.add_metadata({"/Title": f"{e.agreement_title} (signed)"})
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()
