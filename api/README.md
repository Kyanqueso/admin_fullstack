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

### `/api`
Contains the API routes and endpoints.  
- `/local` — Endpoints for local database operations.  
- `/firebase` — Endpoints for Firebase database operations.  

### `/config`
Core configuration files.  
- `sqlite_config.py` — Configuration for SQLite database.  
- `firebase_config.py` — Configuration for Firebase database.  

### `/db`
Database schema definitions.  
- `schema.py` — Database table and model schemas.  

### `/model`
Data models used in the project.  
- `/local` — Models for local database and what to be returned on the Json output.  
- `/firebase` — Models for Firebase database and what to be returned on the Json output..  

### `/service`
**Business logic** and service layer where **CRUD operations and other core functionalities** are implemented.  
- `/local` — Services for performing CRUD operations on the local database.  
- `/firebase` — Services for performing CRUD operations on the Firebase database. 