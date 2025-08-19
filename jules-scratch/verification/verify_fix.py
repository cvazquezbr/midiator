from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # 1. Navigate to the app
            page.goto("http://localhost:5173/")

            # Wait for the main content to load
            expect(page.get_by_text("Nova Campanha")).to_be_visible(timeout=30000)

            # 2. Start a new campaign
            page.get_by_text("Nova Campanha").click()

            # 3. Upload a background image
            # Wait for the image upload area to be visible
            image_upload_area = page.get_by_text("Arraste e solte ou clique para Upload de Imagem")
            expect(image_upload_area).to_be_visible(timeout=15000)

            # Use set_input_files to upload the image
            with page.expect_file_chooser() as fc_info:
                page.get_by_text("Selecionar Imagem").click()
            file_chooser = fc_info.value
            file_chooser.set_files('assets/dummy_image.png')

            # Wait for the image to be loaded and the FieldPositioner to appear
            expect(page.get_by_text("Editor de Campos")).to_be_visible(timeout=15000)

            # 4. Upload a CSV file
            page.locator("input[type='file']").nth(1).set_files('dist/exemplo_posts.csv')

            # Wait for the fields to be populated from the CSV
            expect(page.locator(".text-box", has_text="Nome do Evento: Workshop de Inovação")).to_be_visible(timeout=15000)

            # 5. Double-click a non-HTML text field.
            # Let's use 'Nome do Evento' which is not in the htmlFields list.
            field_to_edit = page.locator(".text-box", has_text="Nome do Evento: Workshop de Inovação")
            field_to_edit.dblclick()

            # 6. Verify the dialog appears
            dialog_title = page.get_by_role("heading", name="Editar Nome do Evento")
            expect(dialog_title).to_be_visible()

            # 7. Edit the text
            # The editor is a Quill editor inside the dialog
            editor_content_area = page.locator(".ql-editor")
            expect(editor_content_area).to_be_visible()

            # Clear existing content and type new text
            editor_content_area.fill("Texto Editado com Sucesso")

            # 8. Save the changes
            page.get_by_role("button", name="Salvar").click()

            # 9. Verify the text has been updated on the canvas
            # The dialog should be closed
            expect(dialog_title).not_to_be_visible()
            # The text on the canvas should be updated
            updated_field = page.locator(".text-box", has_text="Texto Editado com Sucesso")
            expect(updated_field).to_be_visible()

            # Take a screenshot
            page.screenshot(path="jules-scratch/verification/verification.png")
            print("Verification successful, screenshot created.")

        except Exception as e:
            print(f"An error occurred: {e}")
            page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
