import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Set a very generous default timeout for all actions
        page.set_default_timeout(60000)

        try:
            # 1. Navigate to the login page
            print("Navigating to the login page...")
            await page.goto("http://localhost:5173/login")

            # Wait for the body to ensure the page has started loading
            await page.wait_for_selector('body')
            print("Page body loaded.")

            # 2. Perform login with explicit waits
            print("Waiting for email field...")
            email_field = page.get_by_label("Email Address")
            await expect(email_field).to_be_visible()
            await email_field.fill("test@example.com")
            print("Email filled.")

            print("Waiting for password field...")
            password_field = page.get_by_label("Password")
            await expect(password_field).to_be_visible()
            await password_field.fill("password")
            print("Password filled.")

            print("Waiting for Sign In button...")
            sign_in_button = page.get_by_role("button", name="Sign In")
            await expect(sign_in_button).to_be_enabled()
            await sign_in_button.click()
            print("Login submitted.")

            # 3. Wait for the main page to load after login
            print("Waiting for 'Nova Campanha' button...")
            nova_campanha_button = page.get_by_role("button", name="Nova Campanha")
            await expect(nova_campanha_button).to_be_visible()
            await nova_campanha_button.click()
            print("'Nova Campanha' button found and clicked.")

            # 4. Wait for Campaign step and navigate
            await expect(page.get_by_role("heading", name="Campanha")).to_be_visible()
            print("Campaign step loaded.")
            await page.get_by_role("button", name="Próximo").click()

            # 5. Wait for Data Step and upload CSV
            await expect(page.get_by_role("heading", name="Posts Curtos")).to_be_visible()
            print("Data step (Posts Curtos) loaded.")

            async with page.expect_file_chooser() as fc_info:
                await page.get_by_role("button", name="Carregar CSV").click()
            file_chooser = await fc_info.value

            csv_path = 'test/test_data.csv'
            if not os.path.exists(csv_path):
                raise FileNotFoundError(f"Test data file not found at {csv_path}")

            await file_chooser.set_files(csv_path)
            await expect(page.get_by_text("Prévia dos Dados do CSV")).to_be_visible()
            print("CSV uploaded.")

            # 6. Go to Image Step
            await page.get_by_role("button", name="Próximo").click()
            await expect(page.get_by_role("heading", name="Modelo de Página")).to_be_visible()
            print("Image step (Modelo de Página) loaded.")

            # 7. Set background color
            await page.get_by_label("Cor de Fundo").fill("#abcdef")
            print("Set background color.")

            # 8. Go to Generation Step
            await page.get_by_role("button", name="Próximo").click()
            await expect(page.get_by_role("heading", name="Edição de Páginas")).to_be_visible()
            print("Generation step (Edição de Páginas) loaded.")

            # 9. Generate Pages
            await page.get_by_role("button", name="Gerar Páginas").click()
            await expect(page.get_by_text("Páginas Geradas")).to_be_visible(timeout=60000)
            print("Pages generated.")

            # 10. Open editor for the first page
            await page.get_by_role('button', name='Editar').first.click()
            await expect(page.get_by_role("heading", name="Editar Página Gerada #1")).to_be_visible()
            print("Opened page editor.")

            # 11. Open image gallery
            await page.get_by_role('button', name='Galeria').click()
            await expect(page.get_by_role("heading", name="Galeria de Imagens")).to_be_visible()
            print("Image gallery opened.")

            # 12. Select image from gallery
            await page.locator('.MuiImageListItem-root').first.click()
            print("Selected image from gallery.")

            await page.wait_for_timeout(2000) # Wait for image to render in editor

            # 13. Save the page
            await page.get_by_role("button", name="Salvar Alterações").click()
            print("Saved page modifications.")

            # 14. Wait for thumbnail regeneration
            await expect(page.get_by_role("heading", name="Edição de Páginas")).to_be_visible()
            print("Editor closed.")
            await page.wait_for_timeout(3000)

            # 15. Take screenshot
            screenshot_path = "jules-scratch/verification/verification.png"
            await page.screenshot(path=screenshot_path)
            print(f"SUCCESS: Screenshot taken: {screenshot_path}")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
            # Also save page source for debugging
            html = await page.content()
            with open("jules-scratch/verification/error.html", "w") as f:
                f.write(html)
            print("Error screenshot and HTML source saved.")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())