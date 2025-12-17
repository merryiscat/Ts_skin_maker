# Gemini Project Analysis: Tistory Skin Repository

## Project Overview

This repository is a development and archival workspace for creating and managing Tistory blog skins. It features a modern, code-editor-inspired design aesthetic, particularly influenced by IDEs like VS Code and Cursor AI.

The core technologies used are **HTML, CSS (with Tailwind CSS), and JavaScript**. The project is structured to support iterative development, with different versions of the skin organized into numbered directories within `src`.

The main goal of this project is to produce a visually appealing, highly functional, and customizable Tistory skin that is optimized for developers and technical bloggers.

### Key Features

*   **Code Editor Theme:** The skin mimics the look and feel of a modern code editor, with a dark theme, monospaced fonts for code, and a file-tree-style navigation for categories.
*   **Customizable:** The `index.xml` file provides a set of variables that allow users to customize colors, fonts, and features directly from the Tistory admin panel without touching the code.
*   **Responsive Design:** The skin is designed to work well on both desktop and mobile devices.
*   **Tistory Integration:** The skin is built to work seamlessly with Tistory's placeholder system (치환자) to display blog content dynamically.

## Directory Structure

*   `src/`: Contains the source code for the different versions of the skin. Each version has its own directory (e.g., `3.10`, `3.11`, etc.), which includes `skin.html`, `style.css`, `index.xml`, and an `images` directory for assets like JavaScript files.
*   `reference/`: Contains various reference skins and design inspirations. This is a valuable resource for understanding different approaches to Tistory skin development.
*   `troubleshooting/`:  Contains versions of the skin that were created to diagnose and fix specific issues. This is a useful for learning from past challenges.
*   `TISTRORY_skin_guide.md`: A comprehensive guide to Tistory skin development, detailing the file structure, `index.xml` configuration, and the various placeholders (치환자) used in `skin.html` and `style.css`.
*   `TISTORY_quick_reference.md`: A condensed summary of the most important Tistory skin placeholders.

## Development Conventions

### Skin Structure

Each skin version in the `src` directory follows the standard Tistory skin structure:

*   `skin.html`: The main HTML template for the skin. It uses Tistory placeholders to display content.
*   `style.css`: The stylesheet for the skin.
*   `index.xml`: The configuration file for the skin. It defines metadata and customizable variables.
*   `images/`: A directory for assets like JavaScript files and images.

### Technology Stack

*   **HTML:** The structure of the skin is defined in `skin.html`.
*   **CSS:** The skin is styled using a combination of custom CSS and the **Tailwind CSS** framework.
*   **JavaScript:** The skin uses JavaScript for interactive features like the mobile menu and theme toggling.

### Versioning

The skin versions are numbered sequentially in the `src` directory. Each new version represents an iteration of the skin with new features, bug fixes, or design changes.

## Building and Running

Since this is a Tistory skin project, there is no traditional "build" or "run" process. Instead, you upload the skin files to your Tistory blog to see the changes.

### Development Workflow

1.  **Modify the skin files:** Make changes to the `skin.html`, `style.css`, and `index.xml` files in the latest version directory in `src`.
2.  **Upload the files to Tistory:**
    *   Go to your Tistory admin panel.
    *   Navigate to **꾸미기** > **스킨 편집**.
    *   Click the **html 편집** button.
    *   Copy and paste the contents of `skin.html`, `style.css`, and `index.xml` into the corresponding tabs.
    *   Upload any new or modified assets (e.g., JavaScript files) to the `images` directory.
3.  **Preview and save:** Preview your changes and then click **적용** to save them.

## Key Files

*   `src/3.192/skin.html`: The main HTML template for the latest version of the skin.
*   `src/3.192/style.css`: The stylesheet for the latest version of the skin.
*   `src/3.192/index.xml`: The configuration file for the latest version of the skin.
*   `TISTRORY_skin_guide.md`: The primary documentation for Tistory skin development.
*   `TISTORY_quick_reference.md`: A quick reference for Tistory placeholders.
