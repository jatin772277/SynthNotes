import sys
import os
import pymupdf
import easyocr


def main():

    if len(sys.argv) < 2:
        print(
            "ERROR: PDF path is required.",
            file=sys.stderr
        )
        sys.exit(1)

    pdf_path = os.path.abspath(sys.argv[1])

    if not os.path.exists(pdf_path):
        print(
            f"ERROR: PDF not found: {pdf_path}",
            file=sys.stderr
        )
        sys.exit(1)

    try:

        print(
            "Loading EasyOCR...",
            file=sys.stderr
        )

        reader = easyocr.Reader(
            ["en"],
            gpu=False
        )

        document = pymupdf.open(pdf_path)

        all_text = []

        for page_number, page in enumerate(document):

            print(
                f"Processing page {page_number + 1}...",
                file=sys.stderr
            )

            # Render PDF at 300 DPI
            pixmap = page.get_pixmap(
                matrix=pymupdf.Matrix(
                    300 / 72,
                    300 / 72
                ),
                alpha=False
            )

            image_path = os.path.join(
                os.path.dirname(pdf_path),
                f".ocr_page_{page_number + 1}.png"
            )

            pixmap.save(image_path)

            print(
                "Running OCR...",
                file=sys.stderr
            )

            results = reader.readtext(
                image_path,
                detail=1,
                paragraph=False,
                width_ths=0.7,
                height_ths=0.5,
                text_threshold=0.6,
                low_text=0.3,
                link_threshold=0.4,
                mag_ratio=1.0
            )

            # Reading order:
            # top → bottom, left → right
            results = sorted(
                results,
                key=lambda item: (
                    min(point[1] for point in item[0]),
                    min(point[0] for point in item[0])
                )
            )

            for result in results:

                text = result[1].strip()
                confidence = float(result[2])

                print(
                    f"OCR [{confidence:.2f}]: {text}",
                    file=sys.stderr
                )

                if text and confidence >= 0.25:
                    all_text.append(text)

            if os.path.exists(image_path):
                os.remove(image_path)

        document.close()

        cleaned_text = "\n".join(
            line.strip()
            for line in all_text
            if line.strip()
        )

        print(cleaned_text)

    except Exception as error:

        print(
            f"ERROR: {error}",
            file=sys.stderr
        )

        sys.exit(1)


if __name__ == "__main__":
    main()