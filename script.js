const clientId = "6mj5f0uh7sgjal65cl4cbbuuas";
const domain = "ap-south-187q0szfgf.auth.ap-south-1.amazoncognito.com"; 
const redirectUri = "http://localhost:5500";
const apiUrl = "https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/files";

let selectedTags = [];
let allFiles = [];
let adminUsers = [];

function showToast(message, type = "success") {

    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

function showConfirmToast(message, onConfirm) {

    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.style.backgroundColor = "#1f2937";

    toast.innerHTML = `
        <div style="margin-bottom:8px;">${message}</div>
        <button id="confirmYes" style="margin-right:8px; background:#16a34a; color:white; padding:6px 12px; border:none; border-radius:4px;">Yes</button>
        <button id="confirmNo" style="background:#dc2626; color:white; padding:6px 12px; border:none; border-radius:4px;">No</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    document.getElementById("confirmYes").onclick = () => {
        onConfirm();
        container.removeChild(toast);
    };

    document.getElementById("confirmNo").onclick = () => {
        container.removeChild(toast);
    };
}

function updateAuthUI(roleFromAPI = null) {

    const idToken = localStorage.getItem("id_token");
    const loginBtn = document.getElementById("loginBtn");
    const profileContainer = document.getElementById("profileContainer");
    const profileCircle = document.getElementById("profileCircle");
    const profileDropdown = document.getElementById("profileDropdown");
    const profileEmail = document.getElementById("profileEmail");
    const profileRole = document.getElementById("profileRole");

    if (!idToken) {
        loginBtn.style.display = "inline-block";
        profileContainer.style.display = "none";
        return;
    }

    const payload = JSON.parse(atob(idToken.split(".")[1]));
    const email = payload.email || payload["cognito:username"];

    loginBtn.style.display = "none";
    profileContainer.style.display = "inline-block";

    profileCircle.innerText = email.charAt(0).toUpperCase();
    profileEmail.innerText = email;

    if (roleFromAPI) {
        profileRole.innerText = "Role: " + roleFromAPI;
    }
    const manageBtn = document.getElementById("manageUsersBtn");

    if (roleFromAPI === "Admin") {
        manageBtn.style.display = "block";
    } else {
        manageBtn.style.display = "none";
    }
    profileCircle.onclick = () => {
        profileDropdown.style.display =
            profileDropdown.style.display === "block" ? "none" : "block";
    };

    document.addEventListener("click", function (e) {
        if (!profileContainer.contains(e.target)) {
            profileDropdown.style.display = "none";
        }
    });
    const activityBtn = document.getElementById("activityLogsBtn");

    if (roleFromAPI === "Admin") {
        manageBtn.style.display = "block";
        activityBtn.style.display = "block";
    } else {
        manageBtn.style.display = "none";
        activityBtn.style.display = "none";
    }
}

window.onload = function () {

    // Clear search input manually
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.value = "";
        searchInput.setAttribute("autocomplete", "off");
    }

    const idToken = localStorage.getItem("id_token");

    if (idToken) {
        getFiles();
        updateAuthUI();
    } else {
        updateAuthUI();
    }
};
async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        showToast("Select a file first", "error");
        return;
    }
    if (selectedTags.length === 0) {
        showToast("Please add at least one tag before uploading.", "error");
        return;
}
    
    // 1️⃣ Get pre-signed upload URL
    const response = await fetch("https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/upload-url", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("id_token")
        },
        body: JSON.stringify({
            file_name: file.name,
            tags: selectedTags
        })
    });

    const data = await response.json();

    // 2️⃣ Upload file directly to S3
    // 2️⃣ Upload file directly to S3
    await fetch(data.upload_url, {
        method: "PUT",
        headers: {
            "Content-Type": file.type
        },
        body: file
    });

    // 3️⃣ Finalize upload (store metadata + version)
    await fetch("https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/finalize-upload", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("id_token")
        },
        body: JSON.stringify({
            file_id: data.file_id,
            s3_key: data.s3_key,
            file_name: data.file_name,
            tags: data.tags
        })
    });

    showToast("File uploaded and version saved successfully");

// Refresh file list
    getFiles();

    // Clear selected tags
    selectedTags = [];
    document.getElementById("tagList").innerHTML = "";
    }
async function downloadFile(fileId) {
    const response = await fetch(
        `https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/download-url?file_id=${fileId}`,
        {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("id_token")
            }
        }
    );

    const data = await response.json();

    const link = document.createElement("a");
    link.href = data.download_url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function login() {
    document.getElementById("authModal").style.display = "flex";
}


function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");

    // Clear search field
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.value = "";
    }

    // Clear filters
    document.getElementById("filterTag").value = "all";
    document.getElementById("filterOwner").value = "all";

    // Clear table
    document.getElementById("fileTableBody").innerHTML = "";

    showToast("Logged out successfully", "success");

    updateAuthUI();
}
function getFiles() {
    const token = localStorage.getItem("id_token");

    fetch(apiUrl, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log("API RESPONSE:", data);
        const role = data.role;
        window.currentUserRole = role;
        updateAuthUI(role);
        // Hide upload button for Viewer
        const uploadSection = document.getElementById("uploadSection");

        if (role === "Viewer") {
            uploadSection.style.display = "none";
        } else {
            uploadSection.style.display = "block";
        }
        
        allFiles = data.files;
        populateOwnerFilter(allFiles);
        renderFiles(allFiles);
        return;
        
    })
    .catch(err => console.error(err));
}
async function deleteFile(fileId) {

    showConfirmToast("Are you sure you want to delete this file?", async () => {

        await fetch(
            `https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/file?file_id=${fileId}`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": "Bearer " + localStorage.getItem("id_token")
                }
            }
        );

        showToast("File deleted successfully");
        getFiles();
    });

}

async function shareFile(fileId) {
    const response = await fetch(
        `https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/share`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("id_token")
            },
            body: JSON.stringify({
                file_id: fileId,
                expiry_seconds: 300
            })
        }
    );

    const data = await response.json();

    if (!data.share_url) {
        showToast("Error generating share link", "error");
        console.log(data);
        return;
    }

    
    navigator.clipboard.writeText(data.share_url)
    .then(() => {
        showToast("Share link copied to clipboard (valid 5 minutes)");
    })
    .catch(() => {
        showToast("Link generated but could not copy automatically", "error");
    });
}


document.addEventListener("DOMContentLoaded", function () {

    const tagSelect = document.getElementById("tagSelect");
    const addTagBtn = document.getElementById("addTagBtn");
    const tagList = document.getElementById("tagList");

    addTagBtn.addEventListener("click", function () {

        const selectedValue = tagSelect.value;

        if (!selectedValue) {
            showToast("Please select a tag.", "error");
            return;
        }

        if (selectedTags.includes(selectedValue)) {
            showToast("Tag already added.", "error");
            return;
        }

        selectedTags.push(selectedValue);
        renderTags();
        tagSelect.value = "";
    });

    function renderTags() {
        tagList.innerHTML = "";

        selectedTags.forEach(tag => {
            const tagElement = document.createElement("div");
            tagElement.className = "tag";
            tagElement.innerHTML = `
                ${tag}
                <span onclick="removeTag('${tag}')">&times;</span>
            `;
            tagList.appendChild(tagElement);
        });
    }

});

function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    const tagList = document.getElementById("tagList");
    tagList.innerHTML = "";

    selectedTags.forEach(t => {
        const tagElement = document.createElement("div");
        tagElement.className = "tag";
        tagElement.innerHTML = `
            ${t}
            <span onclick="removeTag('${t}')">&times;</span>
        `;
        tagList.appendChild(tagElement);
    });
}
function populateOwnerFilter(files) {

    const ownerSelect = document.getElementById("filterOwner");
    const uniqueOwners = new Set();

    files.forEach(file => {
        if (file.owner_email) {
            uniqueOwners.add(file.owner_email);
        }
    });

    ownerSelect.innerHTML = `<option value="all">All</option>`;

    uniqueOwners.forEach(owner => {
        ownerSelect.innerHTML += `
            <option value="${owner}">${owner}</option>
        `;
    });
}
function renderFiles(files) {

    const tableBody = document.getElementById("fileTableBody");
    // Sort files by last updated (newest first)
    files.sort((a, b) => {

        const aDate = a.versions && a.versions.length > 0
            ? new Date(a.versions[a.versions.length - 1].upload_date)
            : new Date(0);

        const bDate = b.versions && b.versions.length > 0
            ? new Date(b.versions[b.versions.length - 1].upload_date)
            : new Date(0);

        return bDate - aDate;
    });
    tableBody.innerHTML = "";

    files.forEach(file => {

        const versionCount = file.versions ? file.versions.length : 0;

        const lastUpdated = versionCount > 0
        ? formatDate(file.versions[file.versions.length - 1].upload_date)
        : "N/A";

        let tagsHTML = "";
        if (file.tags && file.tags.length > 0) {
            tagsHTML = file.tags.map(tag =>
                `<span class="tag">${tag}</span>`
            ).join(" ");
        }

        let actionsHTML = `
            <button onclick="downloadFile('${file.file_id}')">Download</button>
        `;

        const token = localStorage.getItem("id_token");
        const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
        const currentUserId = payload ? payload.sub : null;

        // DELETE button logic
        if (window.currentUserRole === "Admin") {
            actionsHTML += `
                <button onclick="deleteFile('${file.file_id}')">Delete</button>
                <button onclick="shareFile('${file.file_id}')">Share</button>
            `;
        } else if (window.currentUserRole === "Editor" && file.owner_id === currentUserId) {
            actionsHTML += `
                <button onclick="deleteFile('${file.file_id}')">Delete</button>
                <button onclick="shareFile('${file.file_id}')">Share</button>
            `;
        }

        if (window.currentUserRole === "Editor" || window.currentUserRole === "Admin") {
            actionsHTML += `
                <button onclick="uploadNewVersion('${file.file_id}', '${file.s3_key}', '${file.file_name}')">
                    Upload New Version
                </button>
            `;
        }

        actionsHTML += `
            <button onclick="toggleVersions('${file.file_id}')">
                View Versions (${versionCount})
            </button>
        `;

        // Main row
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${file.file_name}</td>
            <td>${tagsHTML}</td>
            <td>${versionCount}</td>
            <td>${lastUpdated}</td>
            <td>${getOwnerDisplay(file.owner_id, file.owner_email,file.owner_role)}</td>
            <td class="action-buttons">${actionsHTML}</td>
        `;

        tableBody.appendChild(row);

        // Hidden version row
        const versionRow = document.createElement("tr");
        versionRow.id = `versions-${file.file_id}`;
        versionRow.classList.add("version-row");
        versionRow.style.display = "none";

        versionRow.innerHTML = `
            <td colspan="6"></td>
        `;

        tableBody.appendChild(versionRow);
    });
}
document.getElementById("filterTag").addEventListener("change", function () {

    const selectedFilter = this.value;

    if (selectedFilter === "all") {
        renderFiles(allFiles);
        return;
    }

    const filtered = allFiles.filter(file =>
        file.tags && file.tags.includes(selectedFilter)
    );

    renderFiles(filtered);
});

async function uploadNewVersion(fileId, s3Key, fileName) {

    const fileInput = document.createElement("input");
    fileInput.type = "file";

    fileInput.onchange = async function () {

        const newFile = fileInput.files[0];

        if (!newFile) return;

        // 1️⃣ Request upload URL using existing file_id
        const response = await fetch("https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/upload-url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("id_token")
            },
            body: JSON.stringify({
                file_id: fileId,
                file_name: fileName,
                tags: []  // tags unchanged for version update
            })
        });

        const data = await response.json();

        // 2️⃣ Upload new version to same S3 key
        await fetch(data.upload_url, {
            method: "PUT",
            headers: {
                "Content-Type": newFile.type
            },
            body: newFile
        });

        // 3️⃣ Finalize upload to append version
        await fetch("https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/finalize-upload", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("id_token")
            },
            body: JSON.stringify({
                file_id: fileId,
                s3_key: s3Key,
                file_name: fileName,
                tags: []
            })
        });

        showToast("New version uploaded successfully", "success");
        getFiles();
    };

    fileInput.click();
}


function toggleVersions(fileId) {

    const row = document.getElementById(`versions-${fileId}`);
    const file = allFiles.find(f => f.file_id === fileId);

    if (!file || !file.versions) return;

    if (row.style.display === "none") {

        let versionHTML = "<div style='padding:10px;'>";

        file.versions.forEach((v, index) => {
            versionHTML += `
                <div style="margin-bottom:8px;">
                    <strong>Version ${index + 1}</strong> |
                    ID: ${v.version_id} |
                    Date: ${v.upload_date}
                    <button onclick="downloadSpecificVersion('${file.file_id}', '${v.version_id}')">
                        Download
                    </button>
                </div>
            `;
        });

        versionHTML += "</div>";

        row.children[0].innerHTML = versionHTML;
        row.style.display = "table-row";
    } else {
        row.style.display = "none";
    }
}
async function downloadSpecificVersion(fileId, versionId) {

    const response = await fetch(
        `https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/download-url?file_id=${fileId}&version_id=${versionId}`,
        {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("id_token")
            }
        }
    );

    const data = await response.json();

    if (!data.download_url) {
        showToast("Error generating version download link", "error");
        return;
    }

    const link = document.createElement("a");
    link.href = data.download_url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function getOwnerDisplay(ownerId, ownerEmail, ownerRole) {

    const token = localStorage.getItem("id_token");
    if (!token) return ownerEmail || ownerId;

    const payload = JSON.parse(atob(token.split(".")[1]));
    const isYou = ownerEmail === payload.email;

    const displayName = isYou ? "You" : ownerEmail;

    let roleClass =
        ownerRole === "Admin" ? "role-admin" :
        ownerRole === "Editor" ? "role-editor" :
        "role-viewer";

    return `
        <div class="owner-cell">
            <div class="owner-name">${displayName}</div>
            <div class="role-badge ${roleClass}">
                ${ownerRole}
            </div>
        </div>
    `;
}
function applyFilters() {

    const selectedTag = document.getElementById("filterTag").value;
    const selectedOwner = document.getElementById("filterOwner").value;
    const searchText = document.getElementById("searchInput").value.toLowerCase();

    let filtered = allFiles;

    // Filter by Tag
    if (selectedTag !== "all") {
        filtered = filtered.filter(file =>
            file.tags && file.tags.includes(selectedTag)
        );
    }

    // Filter by Owner
    if (selectedOwner !== "all") {
        filtered = filtered.filter(file =>
            file.owner_email === selectedOwner
        );
    }

    // Filter by File Name
    if (searchText) {
        filtered = filtered.filter(file =>
            file.file_name.toLowerCase().includes(searchText)
        );
    }

    renderFiles(filtered);
}
document.getElementById("filterTag").addEventListener("change", applyFilters);
document.getElementById("filterOwner").addEventListener("change", applyFilters);
document.getElementById("searchInput").addEventListener("input", applyFilters);

// AUTH MODAL LOGIC
document.addEventListener("DOMContentLoaded", function () {

    const modal = document.getElementById("authModal");
    

    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };

    

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const switchToSignup = document.getElementById("switchToSignup");
const switchToLogin = document.getElementById("switchToLogin");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

switchToSignup.onclick = function () {
    loginForm.style.display = "none";
    signupForm.style.display = "block";

    authTitle.innerText = "Create Account";
    authSubtitle.innerText = "Sign up to get started";
};

switchToLogin.onclick = function () {
    signupForm.style.display = "none";
    loginForm.style.display = "block";

    authTitle.innerText = "Welcome Back";
    authSubtitle.innerText = "Login to your account";
};
const signupSubmit = document.getElementById("signupSubmit");

signupSubmit.onclick = async function () {

    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if (!email || !password || !confirmPassword) {
        showToast("Please fill all fields", "error");
        return;
    }

    if (password !== confirmPassword) {
        showToast("Passwords do not match", "error");
        return;
    }

    if (!email || !password) {
        showToast("Please fill all fields", "error");
        return;
    }

    await signupUser(email, password);
};
const otpSubmit = document.getElementById("otpSubmit");

otpSubmit.onclick = async function () {

    const code = document.getElementById("otpCode").value;

    if (!code) {
        showToast("Enter verification code", "error");
        return;
    }

    await confirmUserSignup(window.pendingVerificationEmail, code);
};
const loginSubmit = document.getElementById("loginSubmit");

loginSubmit.onclick = async function () {

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        showToast("Please fill all fields", "error");
        return;
    }

    await loginUser(email, password);
};


});

async function signupUser(email, password) {

    const response = await fetch("https://cognito-idp.ap-south-1.amazonaws.com/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityProviderService.SignUp"
        },
        body: JSON.stringify({
            ClientId: clientId,
            Username: email,
            Password: password,
            UserAttributes: [
                {
                    Name: "email",
                    Value: email
                }
            ]
        })
    });

    const data = await response.json();
    console.log("Signup response:", data);

    // 🔴 Handle errors properly
    if (data.__type) {

        if (data.__type.includes("UsernameExistsException")) {
            showToast("Account already exists. Please login instead.", "error");
            return;
        }

        if (data.__type.includes("InvalidPasswordException")) {
            showToast("Password does not meet requirements.", "error");
            return;
        }

        if (data.__type.includes("InvalidParameterException")) {
            showToast("Invalid email format.", "error");
            return;
        }

        showToast(data.message || "Signup failed", "error");
        return;
    }

    // 🟢 Success
    if (data.UserConfirmed === false) {

    showToast("Signup successful. Enter verification code sent to email.", "success");

    // Hide signup form
    document.getElementById("signupForm").style.display = "none";

    // Show OTP form
    document.getElementById("otpForm").style.display = "block";

    // Store email temporarily for verification
    window.pendingVerificationEmail = email;
    window.pendingVerificationPassword = password;
} else {
        showToast("Signup successful!", "success");
    }
}
async function confirmUserSignup(email, code) {

    const response = await fetch("https://cognito-idp.ap-south-1.amazonaws.com/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityProviderService.ConfirmSignUp"
        },
        body: JSON.stringify({
            ClientId: clientId,
            Username: email,
            ConfirmationCode: code
        })
    });

    const data = await response.json();
    console.log("Confirm response:", data);

    if (data.__type) {
        showToast(data.message || "Invalid verification code", "error");
        return;
    }

    showToast("Account verified successfully! Please login.", "success");

    // Hide OTP form
    document.getElementById("otpForm").style.display = "none";

    // Show login form
    document.getElementById("loginForm").style.display = "block";

    document.getElementById("authTitle").innerText = "Welcome Back";
    document.getElementById("authSubtitle").innerText = "Login to your account";

    // Auto fill login credentials
    document.getElementById("loginEmail").value = window.pendingVerificationEmail;
    document.getElementById("loginPassword").value = window.pendingVerificationPassword;
}
async function loginUser(email, password) {

    const response = await fetch("https://cognito-idp.ap-south-1.amazonaws.com/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
        },
        body: JSON.stringify({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        })
    });

    const data = await response.json();
    console.log("Login response:", data);

    if (data.__type) {
        showToast(data.message || "Login failed", "error");
        return;
    }

    const idToken = data.AuthenticationResult.IdToken;
    const accessToken = data.AuthenticationResult.AccessToken;

    localStorage.setItem("id_token", idToken);
    localStorage.setItem("access_token", accessToken);

    showToast("Login successful!", "success");

    // Close modal
    document.getElementById("authModal").style.display = "none";

    // Load user files
    getFiles();
}

function openAdminPanel() {

    document.getElementById("adminModal").style.display = "flex";

    const searchInput = document.getElementById("adminUserSearch");

    searchInput.value = ""; // clear previous search

    searchInput.oninput = function () {

        const searchText = this.value.toLowerCase();

        const filtered = adminUsers.filter(user =>
            user.email.toLowerCase().includes(searchText)
        );

        renderAdminUsers(filtered);
    };

    loadUsers();
}

function closeAdminPanel() {
    document.getElementById("adminModal").style.display = "none";
}

function renderAdminUsers(users) {

    const tableBody = document.getElementById("adminUserTable");
    tableBody.innerHTML = "";

    users.forEach(user => {

        const row = document.createElement("tr");

        const roleClass =
    user.role === "Admin" ? "role-admin" :
    user.role === "Editor" ? "role-editor" :
    "role-viewer";

    row.innerHTML = `
        <td>${user.email}</td>

        <td>
            <span class="role-badge ${roleClass}">
                ${user.role}
            </span>
        </td>

        <td>
            <select id="role-${user.email}">
                <option value="Admin" ${user.role === "Admin" ? "selected" : ""}>Admin</option>
                <option value="Editor" ${user.role === "Editor" ? "selected" : ""}>Editor</option>
                <option value="Viewer" ${user.role === "Viewer" ? "selected" : ""}>Viewer</option>
            </select>
        </td>

        <td>
            <button onclick="updateUserRole('${user.email}')">
                Update
            </button>
        </td>
    `;

        tableBody.appendChild(row);
    });

}
async function loadUsers() {

    const response = await fetch(
        "https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/users",
        {
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("id_token")
            }
        }
    );

    const data = await response.json();

    const tableBody = document.getElementById("adminUserTable");
    tableBody.innerHTML = "";

    const token = localStorage.getItem("id_token");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentAdminEmail = payload.email;

    adminUsers = data.users.filter(user => user.email !== currentAdminEmail);

    renderAdminUsers(adminUsers);
}

document.getElementById("adminUserSearch").addEventListener("input", function () {

    const searchText = this.value.toLowerCase();

    const filtered = adminUsers.filter(user =>
        user.email.toLowerCase().includes(searchText)
    );

    renderAdminUsers(filtered);

});

async function updateUserRole(email) {

    const selectedRole = document.getElementById(`role-${email}`).value;

    showConfirmToast(
        `Are you sure you want to change ${email}'s role to ${selectedRole}?`,
        async () => {

            try {

                const response = await fetch(
                    "https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/update-role",
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + localStorage.getItem("id_token")
                        },
                        body: JSON.stringify({
                            email: email,
                            role: selectedRole
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.error || "Failed to update role", "error");
                    return;
                }

                showToast("Role updated successfully", "success");
                loadUsers();

            } catch (error) {
                showToast("Error updating role", "error");
            }

        }
    );
}
function renderActivityLogs(logs) {

    const tableBody = document.getElementById("activityTableBody");
    tableBody.innerHTML = "";

    // newest first
    logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    logs.forEach(log => {

        const dateObj = new Date(log.timestamp);

        const date = dateObj.toLocaleDateString("en-IN");
        const time = dateObj.toLocaleTimeString("en-IN");

        const email = log.actor_email || log.actor_id;
        const role = log.actor_role || "-";

        const roleClass =
            role === "Admin" ? "role-admin" :
            role === "Editor" ? "role-editor" :
            "role-viewer";

        const actionColor =
            log.action === "DELETE" ? "#ef4444" :
            log.action === "UPLOAD" ? "#16a34a" :
            log.action === "DOWNLOAD" ? "#2563eb" :
            log.action === "SHARE" ? "#9333ea" :
            "#f59e0b";

        const row = document.createElement("tr");

        row.innerHTML = `
        <td>
            <span class="role-badge ${roleClass}">
                ${role}
            </span>
        </td>

        <td>${email}</td>

        <td>
            <span style="
                background:${actionColor};
                color:white;
                padding:3px 8px;
                border-radius:6px;
                font-size:12px;
            ">
                ${log.action}
            </span>
        </td>

        <td>${log.file_name}</td>
        <td>${date}</td>
        <td>${time}</td>
        `;

        tableBody.appendChild(row);
    });
}

function applyActivitySearch() {

    const searchText = document
        .getElementById("activitySearch")
        .value
        .toLowerCase();

    let filtered = window.activityLogs || [];

    if (searchText) {

        filtered = window.activityLogs.filter(log =>
            (log.file_name && log.file_name.toLowerCase().includes(searchText)) ||
            (log.actor_email && log.actor_email.toLowerCase().includes(searchText)) ||
            (log.actor_role && log.actor_role.toLowerCase().includes(searchText)) ||
            (log.action && log.action.toLowerCase().includes(searchText))
        );

    }

    renderActivityLogs(filtered);
}
async function openActivityLogs() {

    document.getElementById("activityModal").style.display = "flex";

    try {

        const response = await fetch(
            "https://p591y4w1m9.execute-api.ap-south-1.amazonaws.com/activity",
            {
                headers: {
                    "Authorization": "Bearer " + localStorage.getItem("id_token")
                }
            }
        );

        const data = await response.json();

        window.activityLogs = data.logs || []; // FIX

        console.log("Activity Logs:", data);

        renderActivityLogs(window.activityLogs);

        const searchInput = document.getElementById("activitySearch");

        searchInput.value = "";

        // attach search event
        searchInput.oninput = applyActivitySearch;

    } catch (error) {
        showToast("Failed to load activity logs", "error");
        console.error(error);
    }
}
function closeActivityLogs() {
    document.getElementById("activityModal").style.display = "none";
}

