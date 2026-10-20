[← Back to the README](../README.md)

# The API Calls the App Makes

The full, authoritative reference is in the **backend README**. These are the calls the frontend makes. 
Protected endpoints need the header `Authorization: Bearer <access token>`.

### User Authentication  
#### Register  
- **URL:** `/register/`  
- **Method:** `POST`  
- **Body Example:**  
  ```json
  {
    "username": "user1",
    "email": "user1@example.com",
    "password": "a-strong-password-42"
  }
  ```
- **Response (201):** `{ "Success": "New user created", "username": "user1", "user_id": 1, "access": "...", "refresh": "..." }`
- **Note:** `first_name` and `last_name` are optional; the app no longer sends them.

#### Login  
- **URL:** `/login/`  
- **Method:** `POST`  
- **Body Example:**  
  ```json
  {
    "username": "user1",
    "password": "a-strong-password-42"
  }
  ```
- **Response (200):** `{ "access": "...", "refresh": "..." }`

#### Renew the session  
- **URL:** `/token/refresh/`  
- **Method:** `POST`  
- **Body:** `{ "refresh": "..." }`  
- **Response (200):** `{ "access": "...", "refresh": "..." }` (the refresh token is replaced each time)

#### Lists of the current user (Home)
- **URL:** `/grouplists/by-user/{user_id}/`  
- **Method:** `GET`  
- **Response:**  
  ```json
  [
    {
      "id": 1,
      "title": "Weekend groceries",
      "items": "✔️ Milk|✔️ Eggs|Bread|Butter|Coffee",
      "date_created": "2026-10-06",
      "user": 2,
      "is_active": true
    }
  ]
  ```  

#### Create a list
- **URL:** `/listitem/` then `/grouplists/`  
- **Method:** `POST`  
- **Body:** `{ "title": "...", "items": "Milk|Eggs", "user": 2, "is_active": true }`, then 
  `{ "user": 2, "list_item": 1, "role": "admin", "permission_type": "full_access" }`

#### Save a list's pictures
- **URL:** `/listitemimages/sync_images/`  
- **Method:** `POST` (multipart)  
- **Description:** Saves all picture changes of a list in one all-or-nothing step when the user presses **Update List**. See the backend API reference for the details.  

####  **Delete ListItem (Deactivate List)**

- **URL:** `/listitem/{id}/`
- **Method:** `PATCH`
- **Body:** `{ "is_active": false }`
- **Description:** Deactivates a list item instead of deleting it. The app asks for confirmation first.

#### **Update ListItem**

- **URL:** `/listitem/{id}/`
- **Method:** `PATCH`
- **Description:** Updates an existing list item (needs ownership or full access).
- **Request Body:**
  ```json
  {
    "title": "Updated Shopping List",
    "items": "Apples|Bananas"
  }
  ```

####  **Share List with User by Email**

- **Steps:** 1) `GET /get_user_info/{email}/` returns the person's `id` (404 means they are not on Lista yet). 
  2) `POST /grouplists/` with the person's `id`.
- **Request Body (step 2):**
  ```json
  {
    "user": 5,
    "list_item": 1,
    "role": "member",
    "permission_type": "read_only"  // or "full_access"
  }
  ```
- **Response (201):**
  ```json
  {
    "message": "GroupList created successfully",
    "data": { "id": 7, "user": 5, "list_item": 1, "role": "member", "permission_type": "read_only" }
  }
  ```

### Workflow

1. **Share a List by Email:**
   - The user enters one or more emails and picks the permission for each (`Read Only` or `Full Access`).
   - For each email the app looks the person up, then saves the share. Everyone who could be shared with is saved; 
     the others stay in the box with a message explaining what to do.
   
2. **Get Shared Lists:**
   - When the shared user opens Home, shared lists appear with their other lists; the permission decides whether they can edit.

3. **Delete and Restore:**
   - A deleted list is only hidden (`is_active: false`), so it can be restored in a future version without losing data.

 * This allows flexibility in how lists are shared and managed between users while allowing the user to set different levels of permissions.

## Data the app works with

The models live in the backend (see the backend README); they are listed here for reference.

### **Users**  
Utilizes Django’s built-in `User` model:  
- **User ID**: Unique identifier.  
- **Username**: Unique within the system, used for login alongside the password
- **First and last name**: optional. The app no longer asks for them, so new accounts have them empty; they are kept for existing accounts and for older app versions that still send them.  
- **Email**: Unique within the system, used for sharing lists and password recovery.  
- **Password**: Secure authentication credential (stored hashed; must meet the strength rules).  

### **ListItem**  
Represents tasks or list items:  
- **List ID**: Unique identifier for the list.  
- **Title**: Default: `"No items"`.  
- **Items**: Stored as plain text, separated by `|`. Checked items start with `✔️ `.  
- **Creation Date**: Auto-generated upon list creation.  
- **Owner**: Associated with the user who created it.  
- **Status**: Active or inactive. Deleting a list in the app sets it to inactive; the data stays in the database.  

### **GroupList**  
Manages collaborative list sharing:  
- **User**: Reference to a participating user.  
- **List**: Reference to the shared list.  
- **Join Date**: Date user joined the group.  
- **Role**: Either `Admin` or `Member`.  
- **Permissions**: `Read-Only` or `Full Access`.  

### **ListItemImage**  
Stores images associated with a specific list item and index:
- **List Item:**: A foreign key linking to the ListItem model
 (on_delete=models.CASCADE, related_name='images').
- **Image:**: An image file, optional (default='/placeholder.png', 
upload_to='list_item_images/').
- **Index:**: Position of the image in the list, defaults to 0.
- **MIME Type:**: Optional field to store the image's MIME type 
(max_length=50)

### **Customization**  
Allows users to personalize their experience:  
- **User**: Reference to the modifying user.  
- **Background**: Identifier for a custom background image.  

> AI suggestions are not stored: they are generated on request by the Netlify function and shown straight away.

