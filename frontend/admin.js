const loginForm = document.querySelector("#admin-login-form");
const loginView = document.querySelector("#login-view");
const signedInView = document.querySelector("#signed-in-view");
const loginMessage = document.querySelector("#login-message");
const sessionMessage = document.querySelector("#session-message");
const submitButton = loginForm.querySelector("button[type='submit']");

function showSignedIn(email) {
  loginView.hidden = true;
  signedInView.hidden = false;
  document.querySelector("#signed-in-email").textContent = email;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "The request could not be completed.");
  return result;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Signing in...";

  const formData = new FormData(loginForm);
  try {
    const result = await requestJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    loginForm.reset();
    showSignedIn(result.email);
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Sign in <span aria-hidden="true">&rarr;</span>';
  }
});

document
  .querySelector("#admin-sign-out")
  .addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    sessionMessage.textContent = "";
    try {
      await requestJson("/api/admin/logout", { method: "POST" });
      signedInView.hidden = true;
      loginView.hidden = false;
      loginMessage.textContent = "You have signed out.";
    } catch (error) {
      sessionMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

requestJson("/api/admin/session")
  .then((session) => {
    if (session.authenticated) showSignedIn(session.email);
  })
  .catch(() => {
    loginMessage.textContent =
      "Login service unavailable. Start the Bloom Coffee server and try again.";
  });
