# Development Branch

**Notice:** This is the **development branch** of the project.

- All active development happens here. 
- **Do not make direct changes** here, ONLY VIA PULL REQUEST.  
- This branch represents the **latest collective effort** of the team  

## Workflow

1. **Create "feature" or "fix" branches based from the `development` branch.**  

2. **Work on your "feature"/"fix" in your branch.**  

3. **Open a pull request to merge your branch into `development`.**  
   - Do **not** merge directly into `main`.   

Keep the main branch clean and stable!

## Project Structure
### `main.js`
Entry-point of the whole application
- contains what html file to intially start at
- contains the logic of automatically running the backend
- contains the exit logic of the application

### `preload.js`
Connects the UI to the Node OS and serves as a connector to the .env file

### `package.json`
Main configuration, dependency, and version management of the application
Auto-generated file

### `package-lock.json`
Provides a snapshot of all the dependencies and sub-dependencies with their exact versions.
Auto-generated file

### `/src/assets`
Contains the images (.png, .jpg, etc.), bootstrap, fonts (Lato) or files (.pdf, .txt, etc.) if needed

### `/src/css`
Contains the global.css file where the global fonts and colors are stored to ensure consistency

### `/src/js`
Global logic of the application

### `/src/js/api.js`
Fetches data from backend (FastAPI)

### `/src/js/router.js`
Handles navigation between pages

### `/src/views`
Contains the actual HTML, CSS, and JS files of each section of the application (Login, Analytics, Companies, and Shoe Content Management)

### `/src/views/.html`
HTML files for that section of the application

### `/src/views/.css`
Specific CSS files for that section of the application

### `/src/views`
Specific JS files for that section of the application
- Contains specific logic and API calls