let accessToken = "";
let instructionName = "";
let uri = "";

const button = document.evaluate(
  "/html/body/div[1]/div[1]/div[1]/div/div/div/div/nav/div[2]/div[1]/div/a/div[3]/span/button",
  document,
  null,
  XPathResult.FIRST_ORDERED_NODE_TYPE,
  null
).singleNodeValue;

button.addEventListener("click", function () {
  setTimeout(function () {
    document.getElementById("prompt-textarea").placeholder = `Message ChatGPT${
      instructionName === "Default (no custom instructions)"
        ? ""
        : ` (${instructionName})`
    }...`;
  }, 1000);
});

function setAccessToken(newToken) {
  //console.log("Setting access token:", newToken);
  accessToken = newToken;
}

function handleError(e) {
  console.error("Handle error", e);
  alert("Handle error", e);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const url = new URL(message.tab.url);
  uri = `${url.protocol}//${url.host}`;

  if (message.type === "applyInstruction") {
    applyInstruction(message);
  }
  if (message.type === "getInstruction") {
    getInstruction();
  }
});

let lastTokenTime = 0;

function updateAccessToken(nextStep) {
  const currentTime = Date.now();

  if (currentTime - lastTokenTime > 5000) {
    fetch(`${uri}/api/auth/session`, { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        setAccessToken(data.accessToken);
        nextStep();
      })
      .catch(handleError);
    lastTokenTime = currentTime;
  } else {
    setTimeout(nextStep, 1000);
  }
}

function getHeaders() {
  return {
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
  };
}
function getInstruction() {
  if (!accessToken) {
    console.log(
      "Obtaining token to look up currently configured instructions."
    );
    return updateAccessToken(getInstruction);
  }
  return fetch(`${uri}/backend-api/user_system_messages`, {
    method: "GET",
    headers: getHeaders(),
  })
    .then((response) => response.json())
    .then((data) => {
      chrome.runtime.sendMessage({ type: "currentInstruction", data: data });
    })
    .catch((e) => {
      console.error(
        "Error looking up currently configured instructions. Re-requesting token.",
        e
      );
      updateAccessToken(getInstruction);
    });
}

function applyInstruction(message) {
  const instructions = message.instructions;

  function retryApply() {
    console.log("Re-attempting to apply custom instruction set.");
    applyInstruction(message);
  }

  sendInstructions();

  function updatePlaceholder(name) {
    instructionName = name;
    button.click();
  }

  function sendInstructions() {
    if (!accessToken) {
      console.log("Obtaining token to apply custom instruction set.");
      return updateAccessToken(retryApply);
    }
    fetch(`${uri}/backend-api/user_system_messages`, {
      method: "POST",
      body: JSON.stringify({
        about_user_message: instructions.about_user_message,
        about_model_message: instructions.about_model_message,
        enabled: true,
      }),
      headers: getHeaders(),
    })
      .then((response) => response.json())
      .then((data) => {
        updatePlaceholder(instructions.name);
        chrome.runtime.sendMessage({ type: "closePopup" });
      })
      .catch((e) => {
        console.error(
          "Error applying custom instruction set. Re-requesting token.",
          e
        );
        updateAccessToken(retryApply);
      });
  }
}
