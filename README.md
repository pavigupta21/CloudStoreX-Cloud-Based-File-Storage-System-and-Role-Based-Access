# CloudStoreX

### Cloud Based File Storage System with Role-Based Access Control

CloudStoreX is a **serverless cloud file storage system** built using **Amazon Web Services (AWS)**. The platform allows users to securely upload, manage, share, and download files while enforcing **Role-Based Access Control (RBAC)**.

The application uses a **fully serverless architecture** with services such as Amazon S3, Amazon Cognito, AWS Lambda, API Gateway, and DynamoDB.

---

# Live Deployment

The application is deployed using **Amazon S3 Static Website Hosting**.

**Live Application:**
[http://cloudstorex-host-bucket.s3-website.ap-south-1.amazonaws.com](http://cloudstorex-host-bucket.s3-website.ap-south-1.amazonaws.com)


---

# Application Screenshot

Below is the interface of the CloudStoreX web application.

<img width="2880" height="1696" alt="Screenshot (1834)" src="https://github.com/user-attachments/assets/0e47357f-0be2-4715-a6fe-17e0d83f14cf" />

---

# Architecture Overview

The system follows a **serverless cloud architecture** where AWS services handle authentication, storage, backend processing, and database operations.

Main components include:

* **Amazon Cognito** – Authentication and role management
* **Amazon API Gateway** – REST API for frontend communication
* **AWS Lambda** – Serverless backend functions
* **Amazon S3** – File storage with versioning enabled
* **Amazon DynamoDB** – File metadata and activity logging
* **S3 Static Hosting** – Frontend hosting

Architecture Diagram:

<img width="1512" height="589" alt="CloudStoreX_architecture" src="https://github.com/user-attachments/assets/fb60b9c6-2ce3-46ab-93f1-0533a13723fb" />


---

# Features

### Secure Authentication

* User authentication using **Amazon Cognito**
* Role-based access control using **Cognito groups**
* Default role for new users is **Viewer**

---

### File Management

Users can perform the following operations depending on their role:

* Upload files
* Upload new versions of files
* Download files
* Share files using secure links
* Delete files

---

### File Versioning

* S3 **versioning enabled**
* Every upload creates a **new version**
* Previous file versions are preserved

---

### Secure File Sharing

Files can be shared using **temporary pre-signed URLs**.

Security features:

* Share link expiration: **5 minutes**
* Access controlled by backend authorization

---

### Metadata Storage

File metadata is stored in **DynamoDB** including:

* File ID
* File Name
* Owner ID
* Owner Email
* Tags
* S3 Object Key
* Version History

---

### Activity Monitoring

All operations are logged in DynamoDB:

* Upload
* Download
* Share
* Delete

Admins can monitor activity logs for auditing.

---

# User Roles and Permissions

## Admin

Admins have full control over the system.

Permissions:

* Upload files
* Upload new versions
* Download files
* Share files
* Delete any file
* Manage user roles
* View activity logs

---

## Editor

Editors can manage their own uploaded files.

Permissions:

* Upload files
* Upload new versions
* Download files
* Share their own files
* Delete their own files

---

## Viewer

Viewers have read-only access.

Permissions:

* Download files only

---

# AWS Services Used

| Service            | Purpose                      |
| ------------------ | ---------------------------- |
| Amazon Cognito     | User authentication and RBAC |
| Amazon API Gateway | REST API gateway             |
| AWS Lambda         | Serverless backend logic     |
| Amazon S3          | File storage and versioning  |
| Amazon DynamoDB    | Metadata and activity logs   |
| S3 Static Hosting  | Frontend hosting             |

---

# DynamoDB Tables

## File Metadata Table

`f13-FileMetaData`

Stores file information:

```
file_id
file_name
owner_email
owner_id
tags
s3_key
versions[]
```

---

## Activity Log Table

`f13-ActivityLog`

Stores system activity logs:

```
activity_id
action
actor_email
actor_role
owner_id
timestamp
```

---

# Lambda Functions

| Function                    | Purpose                        |
| --------------------------- | ------------------------------ |
| GenerateUploadUrlFunction   | Generate pre-signed upload URL |
| FinalizeUploadFunction      | Store metadata after upload    |
| ListFilesFunction           | Retrieve file list             |
| GenerateDownloadUrlFunction | Generate secure download link  |
| GenerateShareUrlFunction    | Generate shareable file link   |
| DeleteFileFunction          | Delete file and metadata       |
| ListUsersFunction           | Retrieve users from Cognito    |
| UpdateUserRoleFunction      | Update user roles              |
| GetActivityLogsFunction     | Retrieve activity logs         |

---

# File Upload Workflow

1. User requests upload URL
2. API Gateway triggers **GenerateUploadUrlFunction**
3. Pre-signed S3 upload URL is generated
4. File uploaded directly to **Amazon S3**
5. **FinalizeUploadFunction** stores metadata
6. Upload activity logged in DynamoDB

---

# File Download Workflow

1. User requests download
2. API Gateway triggers **GenerateDownloadUrlFunction**
3. Pre-signed download URL generated
4. File downloaded from **S3**
5. Download activity logged

---

# File Sharing Workflow

1. User requests share link
2. **GenerateShareUrlFunction** generates pre-signed URL
3. Share link expires after **5 minutes**

---

# Filtering and Search

Files can be filtered by:

* File name
* Owner ID
* Tags

Activity logs can be filtered by:

* File name
* Owner role
* Owner ID
* Timestamp

---

# Project Structure

```
CloudStoreX
│
├── frontend
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── lambda-functions
│   ├── GenerateUploadUrlFunction
│   ├── FinalizeUploadFunction
│   ├── GenerateDownloadUrlFunction
│   ├── GenerateShareUrlFunction
│   ├── DeleteFileFunction
│   ├── ListFilesFunction
│   ├── ListUsersFunction
│   ├── UpdateUserRoleFunction
│   └── GetActivityLogsFunction
│
├── architecture.png
├── screenshot.png
└── README.md
```

---

# Security Features

* Role-based access control
* Cognito authentication
* Secure S3 access via pre-signed URLs
* Activity logging for auditing
* S3 versioning enabled

---

