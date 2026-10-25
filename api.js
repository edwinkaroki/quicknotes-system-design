const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];

// Reusable request function: checks HTTP errors and returns response data.
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    // DELETE may return an empty response.
    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const data = await response.json();

    return { data, status: response.status };
}

// Display notes safely using textContent, not HTML strings.
function renderNotes(noteArray) {
    notesList.replaceChildren();

    if (noteArray.length === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.textContent = "No notes to display.";
        notesList.appendChild(emptyMessage);
        return;
    }

    noteArray.forEach(function(note) {
        const item = document.createElement("li");

        const title = document.createElement("h3");
        title.textContent = note.title;

        const body = document.createElement("p");
        body.textContent = note.body;

        item.append(title, body);
        notesList.appendChild(item);
    });
}

// Task 1: GET the first 10 notes.
async function loadNotes() {
    loadButton.disabled = true;
    statusMessage.textContent = "Loading notes...";
    statusMessage.className = "status-loading";

    try {
        const result = await request(`${API_URL}?_limit=10`);
        notes = result.data;
        renderNotes(notes);

        statusMessage.textContent = notes.length === 0
            ? "No notes were returned by the server."
            : `Loaded ${notes.length} notes from the server.`;

        statusMessage.className = "status-success";
    } catch (error) {
        notes = [];
        renderNotes(notes);
        statusMessage.textContent =
            "Sorry, we couldn't load your notes. Please try again.";
        statusMessage.className = "status-error";
        console.error("Failed to load notes:", error);
    } finally {
        loadButton.disabled = false;
    }
}

loadButton.addEventListener("click", loadNotes);