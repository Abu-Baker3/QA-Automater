# 📘 QA Automater — Complete Beginner's User Guide

Welcome to **QA Automater**! This guide is designed for everyone — whether you are a manual tester, product manager, QA engineer, or developer. After reading this guide, you will be able to easily navigate QA Automater and turn plain-English user stories into automated, runnable Playwright test suites in minutes.

---

## 💡 What is QA Automater?

Imagine having a dedicated AI QA Engineer who:
1. **Reads your web application's codebase** (React, Next.js).
2. **Finds every button, input, form, and link** and learns how to interact with them.
3. **Reads your user stories** written in plain English (e.g., *"User logs in and updates their profile picture"*).
4. **Automatically writes clean, ready-to-run Playwright test code** for you!

No manual writing of CSS selectors or Playwright code is required. QA Automater does the heavy lifting for you!

---

## 📋 What You Need Before Starting (Prerequisites)

Before you begin, make sure you have:
1. **A Web Browser** (Chrome, Edge, Firefox, or Safari).
2. **A GitHub Account** (with admin or write access to the repository you want to test).
3. **Your Web Application Codebase** (React or Next.js repository hosted on GitHub).
4. *(Optional for running tests locally)* **Node.js v20+** installed on your computer.

---

## 🗺️ Quick System Overview: The 5-Step Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Connect Repo │ ──> │  2. Scan Code   │ ──> │ 3. Enter Story  │ ──> │ 4. Review Steps │ ──> │ 5. Export Code  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
  Install GitHub App     AI indexes UI elements   Paste user requirement   Approve AI suggestions   Download ZIP / PR
```

---

## 🚀 Step-by-Step Walkthrough

### Step 1: Log In & Access Your Workspace

1. Open your browser and navigate to: **`http://localhost:3001`**
2. Click **Sign In / Sign Up**.
3. You can log in using your **Email**, **Google**, or **GitHub** account via our secure single sign-on screen.
4. Once signed in, you will be greeted by the **QA Automater Dashboard**.

> 💡 **Tip:** If you belong to a team, click the Organization Switcher at the top left to switch between your personal workspace and company organizations.

---

### Step 2: Connect Your GitHub Repository

To let QA Automater analyze your application, you need to connect your GitHub repository:

1. On the Dashboard, click the **Connect Repository** button.
2. A modal will pop up prompting you to authorize the **QA Automater GitHub App**.
3. Click **Install & Authorize on GitHub**.
4. Choose whether to grant access to **All Repositories** or select specific repositories (e.g., `my-company/frontend-app`).
5. You will be redirected back to QA Automater, and your connected repository will appear in your **Active Repositories** list!

---

### Step 3: Scan Your Codebase

Before generating tests, QA Automater needs to scan your project's source code to locate interactable UI elements (buttons, inputs, dropdowns, forms).

1. In your **Active Repositories** list, locate your repository.
2. Click the **Scan Repository** button.
3. The background scanner will clone your code, analyze your components (React / Next.js AST), and construct a **UI Knowledge Base**.
4. You will see a live progress bar tracking the scan (e.g., `Parsing components... 45% -> 100%`).
5. Once complete, the status badge will change to **`Scanned (Ready for Test Gen)`**.

> 🔍 **What happens during a scan?** 
> QA Automater identifies element locators using a resilient ranking strategy:
> 1. `data-testid` attributes (e.g., `data-testid="login-submit-btn"`) — *Most Reliable*
> 2. ARIA Roles & Accessible Names (e.g., `role="button" name="Submit"`)
> 3. Form Label associations (e.g., `label="Email Address"`)
> 4. Placeholder text (e.g., `placeholder="Enter your email"`)
> 5. CSS selectors (Fallback)

---

### Step 4: Write & Input Your User Story

Now you're ready to create automated tests!

1. Click on **Test Generation Wizard** in the top navigation bar.
2. Select your scanned repository from the dropdown menu.
3. In the text area, enter your **User Story** or requirement in plain English.

#### ✍️ Examples of Good User Stories:

**Example 1: E-Commerce Add to Cart**
```text
As a shopper, I want to search for "Wireless Headphones", select the first search result, click "Add to Cart", and verify that the cart count updates to 1.
```

**Example 2: User Login & Profile Update**
```text
Given a registered user on the login page, when they enter "user@example.com" into the email field and "Password123!" into the password field and click "Log In", then they should be redirected to the dashboard and see a welcome banner.
```

4. Click **Generate Test Plan**.
5. QA Automater's **Story Agent** will break down your prompt into individual test steps and query the **UI Knowledge Base** to match each step with the exact UI element from your application.

---

### Step 5: Review & Approve Mappings (Human-in-the-Loop)

QA Automater assigns a **Confidence Score** (0% to 100%) to every matched element step.

- **High Confidence (≥85%):** Automatically matched and approved!
- **Low Confidence (<85%):** Flagged for your quick review in the **Review Queue**.

#### How to use the Review Queue:
1. If any steps need review, a notification banner will appear: *"2 steps require human review"*.
2. Click **Open Review Queue**.
3. For each flagged step:
   - Read the step description (e.g., *"Click Submit Order Button"*).
   - View the AI's suggested locator candidate.
   - If the candidate looks correct, click **Approve Mapping** ✅.
   - If you want a different element, click **Search Element** to browse all extracted UI elements in your codebase and pick the right one 🎯.
4. Once all steps are approved, click **Finalize & Generate Code**.

---

### Step 6: Export & Run Your Automated Tests!

Congratulations! Your automated Playwright test suite is ready. QA Automater gives you two easy options to export your code:

#### Option A: Download ZIP File 📦
1. Click **Export as ZIP**.
2. Save the `.zip` archive to your computer and extract it.
3. Open a terminal in the extracted folder and run:
   ```bash
   npm install
   npx playwright test
   ```
4. Playwright will launch a browser, execute your generated test steps, and output a pass/fail report!

#### Option B: Export as GitHub Pull Request 🔀
1. Click **Export to GitHub PR**.
2. Enter a branch name (e.g., `tests/e-commerce-add-to-cart`).
3. Click **Create Pull Request**.
4. QA Automater will automatically push the generated Page Object files and spec files to a new branch on GitHub and open a Pull Request for your team to review and merge!

---

## 🛠️ Exploring Additional Dashboard Features

### 🔍 UI Knowledge Base Explorer
Want to see every button, input, and form element extracted from your application?
- Go to **UI Knowledge Base** in the navigation menu.
- Search by tag (e.g., `button`, `input`), search by text, or filter by stability tier.
- View exact file locations (e.g., `src/components/LoginForm.tsx:42`).

### 👥 Team & Organization Management
- Go to **Organization Settings**.
- Click **Invite Member**.
- Enter your team member's email address and assign their role (**Admin** or **Member**).
- They will receive an email invitation to join your workspace!

---

## ❓ Frequently Asked Questions (FAQ) & Troubleshooting

#### Q1: What if my UI elements do not have `data-testid` attributes?
> **Answer:** Don't worry! QA Automater uses a multi-tier search strategy. If `data-testid` is missing, it intelligently falls back to ARIA roles, button text, form labels, or placeholder attributes.

#### Q2: What web frameworks are supported?
> **Answer:** QA Automater currently supports **React** (Vite, Create React App) and **Next.js** (App Router & Pages Router). Support for Vue and Svelte is in preview.

#### Q3: Can I run the exported Playwright tests in CI/CD pipelines (GitHub Actions, GitLab)?
> **Answer:** Yes! The exported code is standard, high-quality TypeScript Playwright code utilizing the industry-standard Page Object Model (POM). You can add `npx playwright test` to any CI pipeline.

#### Q4: How long does a codebase scan take?
> **Answer:** For typical repositories (50–500 component files), a scan completes in under **30 seconds**.

---

## 🆘 Need Help?

If you encounter any issues:
- Check that your GitHub App permissions are granted.
- Re-run the scan if you pushed major code changes to your repository.
- Reach out to your organization admin or consult our technical support docs!
