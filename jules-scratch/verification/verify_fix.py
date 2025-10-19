
import re
from playwright.sync_api import sync_playwright, expect
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")

        # Simulate a logged-in user by setting a dummy token
        page.evaluate("""() => {
            localStorage.setItem("user", JSON.stringify({
                "uuid": "test-user-uuid",
                "email": "test@example.com",
                "name": "Test User"
            }));
            localStorage.setItem("google_access_token", "test-token");
        }""")

        # Reload the page to apply the mocked login
        page.reload()

        # Wait for the loading spinner to disappear
        page.wait_for_selector('.MuiCircularProgress-root', state='hidden')

        # Create a new campaign
        page.get_by_role("button", name="Create New Campaign").click()

        # Create a campaign object without csvHeaders and save it to a file
        campaign_data = {
            "csvData": [
                {"Título": "Test Post 1", "Texto Principal": "Content for post 1"},
                {"Título": "Test Post 2", "Texto Principal": "Content for post 2"},
            ],
            "generatedPagesData": [
                {"index": 0, "record": {"Título": "Test Post 1", "Texto Principal": "Content for post 1"}},
                {"index": 1, "record": {"Título": "Test Post 2", "Texto Principal": "Content for post 2"}},
            ]
        }

        with open("jules-scratch/verification/campaign.json", "w") as f:
            json.dump(campaign_data, f)

        # Use the file to simulate loading a campaign
        page.evaluate(f"""(campaignData) => {{
            const campaignContext = window.campaignContext;
            if (campaignContext) {{
                campaignContext.applyLoadedCampaign({{
                    campaign_data: campaignData,
                    pendingAssets: {{}}
                }});
            }}
        }}""", json.loads(open("jules-scratch/verification/campaign.json").read()))

        # Navigate to page editor
        page.get_by_role("button", name="Next").click()
        page.get_by_role("button", name="Next").click()
        page.get_by_role("button", name="Next").click()

        # Click on the first page to open the editor
        page.locator(".MuiCard-root").first.click()

        # Verify that the editor is open
        expect(page.get_by_text("Edit Generated Page")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
