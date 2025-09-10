import re
from playwright.sync_api import sync_playwright, Page, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app
        page.goto("http://localhost:4173/")

        # Check if login is required by looking for the email field
        email_input = page.locator('input[name="email"]')
        # Give it a moment to appear
        email_input.wait_for(timeout=5000)

        if email_input.is_visible():
            print("Login page detected. Logging in...")
            page.locator("#email").fill("teste@teste.com")
            page.locator("#password").fill("teste1234")
            page.locator('button[type="submit"]').click()

            # Wait for either successful navigation or an error message
            success_locator = page.get_by_text("Minhas Campanhas")
            error_locator = page.locator('[role="alert"]')

            expect(success_locator.or_(error_locator)).to_be_visible()

            # Check if login failed
            if error_locator.is_visible():
                error_text = error_locator.inner_text()
                raise Exception(f"Login failed with error: {error_text}")

            print("Login successful.")

        # 2. Navigate to "Posts Curtos" (Step 2)
        # The app starts at step 0 ("Minhas Campanhas"). Click to create a new one.
        page.get_by_role("button", name="Criar nova campanha").click()
        # Now at step 1 ("Campanha"). Click next.
        page.get_by_role("button", name="Próximo").click()

        # Now at step 2 ("Posts Curtos")
        expect(page.get_by_text("Passo 2: Posts Curtos")).to_be_visible()
        print("Navigated to Posts Curtos step.")

        # 3. Upload CSV
        csv_path = os.path.abspath("jules-scratch/verification/test_data.csv")
        with page.expect_file_chooser() as fc_info:
            page.get_by_role("button", name="Carregar CSV").click()
        file_chooser = fc_info.value
        file_chooser.set_files(csv_path)
        print("CSV file uploaded.")

        # Wait for the table to show the data
        expect(page.get_by_text("O que é Hominismo?")).to_be_visible()
        print("CSV data loaded into table.")

        # 4. Navigate to "Modelo de Página" (Step 3)
        page.get_by_role("button", name="Próximo").click()
        expect(page.get_by_text("Passo 3: Modelo de Página")).to_be_visible()
        print("Navigated to Modelo de Página step.")

        # 5. Upload a foreground image
        image_path = os.path.abspath("src/assets/exemplo_background.png")

        # The "Adicionar Imagem" button is inside an accordion "Imagens da Página"
        page.get_by_role("button", name="Imagens da Página").click()

        with page.expect_file_chooser() as fc_info:
            page.get_by_role("button", name="Adicionar Imagem").click()
        file_chooser_image = fc_info.value
        file_chooser_image.set_files(image_path)
        print("Foreground image uploaded.")

        # 6. Assert that the image list is updated
        image_manager_section = page.get_by_role("button", name="Imagens da Página").locator("..")
        image_list = image_manager_section.get_by_role("list")
        expect(image_list.get_by_role("listitem")).to_have_count(1)
        print("Image list updated correctly.")

        # 7. Take a screenshot for visual verification.
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Verification script ran successfully and took a screenshot.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
