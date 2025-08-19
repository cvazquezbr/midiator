from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")
        page.wait_for_timeout(5000)

        # Step 1: Fill campaign details and generate
        page.fill("text=Problema ou Necessidade", "My problem")
        page.fill("text=Solução ou Proposta", "My solution")
        page.click("text=Elaborar Postagens")
        page.wait_for_selector("text=Conteúdo Principal")

        # Go to the next step (Posts Curtos)
        page.click("text=Próximo")

        # Go to the next step (Imagem e Formatação)
        page.click("text=Próximo")

        # Upload an image
        with page.expect_file_chooser() as fc_info:
            page.click("text=Selecionar Imagem")
        file_chooser = fc_info.value
        file_chooser.set_files("assets/dummy_image.png")

        # Wait for the image to be loaded and the FieldPositioner to be visible
        page.wait_for_selector("text=Posicionar e Formatar")
        page.screenshot(path="jules-scratch/verification/01_field_positioner.png")

        # Go back to the upload view
        page.click("text=Alterar Imagem de Fundo")
        page.wait_for_selector("text=Arraste e solte ou clique para Upload de Imagem")
        page.screenshot(path="jules-scratch/verification/02_upload_view.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
