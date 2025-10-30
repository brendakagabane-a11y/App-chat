const { createClient } = window.supabase;

// Supabase project credentials
const SUPABASE_URL = "https://sjwxnduaaohsdsjvfwhq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd3huZHVhYW9oc2RzanZmd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDQzOTksImV4cCI6MjA3NzQyMDM5OX0.RZ-WCNZMPHvXeww8JCV2ZS0_QrR9oEVRvjjlNiOw3yk"; // 🔑 replace this with your actual anon public key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const messageList = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const usernameInput = document.getElementById("usernameInput");

// Load previous messages
async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading messages:", error);
  } else {
    messageList.innerHTML = "";
    data.forEach(addMessage);
    scrollToBottom();
  }
}

function addMessage(msg) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>${msg.username}</strong>: ${msg.message}`;
  messageList.appendChild(li);
  scrollToBottom();
}

function scrollToBottom() {
  messageList.scrollTop = messageList.scrollHeight;
}

// Listen for realtime inserts
supabase
  .channel("public:messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      addMessage(payload.new);
    }
  )
  .subscribe();

// Send a message
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const message = messageInput.value.trim();
  if (!username || !message) return;

  const { error } = await supabase.from("messages").insert([{ username, message }]);
  if (error) console.error("Send error:", error);
  messageInput.value = "";
});

loadMessages();
