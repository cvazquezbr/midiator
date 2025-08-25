import re
from playwright.sync_api import sync_playwright, Page, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Go to the app and set the API key and a dummy user object in local storage
        page.goto("http://localhost:5173/")
        api_key = "AIzaSyBSsqpQZLeaLzJp-cpJI3fOr5Z-TkkZe-U"
        page.evaluate(f"localStorage.setItem('gemini_api_key', '{api_key}')")
        page.evaluate("localStorage.setItem('user', JSON.stringify({ 'uuid': 'test-user' }))")

        # Go to the posts curtos step
        page.goto("http://localhost:5173/")
        page.get_by_role("button", name="Posts Curtos").click()

        # Upload CSV
        with page.expect_file_chooser() as fc_info:
            page.get_by_role("button", name="Carregar CSV").click()
            page.get_by_text("Carregue um arquivo CSV").click()
        file_chooser = fc_info.value
        file_chooser.set_files("jules-scratch/dummy_data.csv")

        # Go to the image step
        page.get_by_role("button", name="Imagem e Formatação").click()

        # Upload background image
        with page.expect_file_chooser() as fc_info:
            page.get_by_role("button", name="Selecionar Imagem").click()
        file_chooser = fc_info.value
        file_chooser.set_files("assets/dummy_image.png")

        # Take a screenshot of the preview
        page.wait_for_selector(".elements-wrapper")
        page.screenshot(path="jules-scratch/verification/preview.png")

        # Go to the generate image step
        page.get_by_role("button", name="Gerar Imagens").click()

        # Generate the image
        page.get_by_role("button", name="Gerar Imagens").click()

        # Wait for the image to be generated
        generated_image = page.locator("img[alt='Preview 1']")
        expect(generated_image).to_be_visible(timeout=20000)

        # Save the generated image
        image_src = generated_image.get_attribute("src")

        import base64
        import re

        # Remove the data URL prefix
        base64_data = re.sub('^data:image/.+;base64,', '', image_src)

        # Decode the base64 string
        image_data = base64.b64decode(base64_data)

        # Save the image to a file
        with open("jules-scratch/verification/generated.png", "wb") as fh:
            fh.write(image_data)

        print("Test verification completed successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
