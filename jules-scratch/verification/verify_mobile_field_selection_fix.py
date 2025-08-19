from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context(
        viewport={'width': 375, 'height': 667},
        is_mobile=True,
    )
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

        # Open the formatting drawer
        page.click("button[aria-label='edit']")

        # Click on a field to select it
        page.click(".text-box") # This is a guess, I may need to adjust the selector

        # Take a screenshot to verify that the formatting panel appears correctly
        page.screenshot(path="jules-scratch/verification/01_mobile_field_selected.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
