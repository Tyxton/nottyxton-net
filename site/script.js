// --- THE GLOBAL TUI ENGINE ---

window.playTuiSound = function (type) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "click") {
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    }
  } catch (e) {
    /* Browser blocked audio or not supported */
  }
};

window.loadModule = async function (moduleName) {
  // 1. Force find the elements every single time
  const viewscreen = document.getElementById("module-viewscreen");
  const commandLabel = document.getElementById("command-label");

  if (!commandLabel) {
    console.warn(
      "COMMAND_LABEL_NOT_FOUND: Check if <div id='command-label'> exists in index.html",
    );
  }

  // 3. Path Logic
  const filePath = moduleName.replace("_", "/");
  const fileName = filePath.split("/").pop();

  // 4. Update the Prompt (Forcing the innerHTML)
  if (commandLabel) {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Shorter Mobile Version: $~ cat file.log
      commandLabel.innerHTML = `<span class="prompt">$~</span> cat ${fileName}.log`;
    } else {
      // Full Desktop Version: root@nottyton:~$ cat /root/projects/modules/path/file.log
      const displayPath = `/root/projects/modules/${filePath}.log`;
      commandLabel.innerHTML = `<span class="prompt">root@nottyton:~$</span> cat ${displayPath}`;
    }

    console.log("PROMPT_MODE:", isMobile ? "MOBILE" : "DESKTOP");
  }

  // 5. Fetch Content
  try {
    const response = await fetch(`./modules/${filePath}.html`);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const text = await response.text();

    if (viewscreen) {
      viewscreen.classList.add("glitch-active");
      viewscreen.innerHTML = text;

      // Restart typing animation
      viewscreen.classList.remove("typing-animation");
      void viewscreen.offsetWidth;
      viewscreen.classList.add("typing-animation");

      setTimeout(() => viewscreen.classList.remove("glitch-active"), 200);
    }
  } catch (err) {
    console.error("LOAD_ERR:", err);
  }
};
// Keyboard Functions - NAV
window.addEventListener("keydown", (e) => {
  const fKeyMap = {
    F1: "system_audit",
    F2: "infra_index",
    F3: "auto_index",
    F4: "lab_index",
    F5: "net_index",
    F9: "RESUME_REDIRECT", // Not a module
  };

  if (fKeyMap[e.key]) {
    // Prevent default browser behavior (like opening Help or refreshing)
    e.preventDefault();

    if (e.key === "F9") {
      const commandLabel = document.getElementById("command-label");
      if (commandLabel) {
        commandLabel.innerHTML = `<span class="prompt">root@nottyton:~$</span> exec ./resume_download.sh --open`;

        setTimeout(() => {
          window.loadModule(currentModule);
        }, 2000);
      }

      // Open PDF in a new tab
      window.open("./assets/tSexton_Resume.pdf", "_blank");
      // Execute the module load
    } else {
      window.loadModule(fKeyMap[e.key]);

      // Visual Feedback: Update the 'active' class on the buttons
      document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-module") === fKeyMap[e.key]) {
          btn.classList.add("active");
        }
      });
    }

    // Audio Feedback: Indicate button press with audio que
    if (window.playTuiSound) window.playTuiSound("click");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const mainContent = document.getElementById("main-content");
  let bootTimeouts = [];

  // --- 2. BOOT LOGIC ---
  function startBoot() {
    const bootLines = [
      { t: "NOTTYXTON BIOS v 2.0.1 (C) 2026", d: 0 },
      { t: "CPU: Intel(R) Xeon(R) Gold - 16 Cores @ 3.2GHz", d: 100 },
      { t: "MEM: 128GB ECC REGISTERED DDR4... OK", d: 200 },
      { t: "STORAGE: ZFS-POOL-01 [ONLINE]", d: 300 },
      { t: "------------------------------------------------", d: 350 },
      { t: "LOADING KERNEL MODULES...", d: 450 },
      { t: "[ OK ] kvm_intel", d: 500 },
      { t: "[ OK ] zfs_arc", d: 550 },
      { t: "[ OK ] vfio_pci", d: 600 },
      { t: "STARTING NETWORK UPLINK: eth0 -> br0", d: 800 },
      { t: "INIT PROXMOX_VE_CORE...", d: 1000 },
      { t: "PROGRESS: [##########----------] 50%", d: 1300 },
      { t: "PROGRESS: [####################] 100%", d: 1600 },
      { t: "MOUNTING /root/projects/...", d: 1800 },
      { t: "ESTABLISHING SSH_TUNNEL TO HOU_NODE...", d: 2100 },
      { t: "SYSTEM READY. HANDING OVER TO TUI_INTERFACE.", d: 2500 },
    ];

    // Add the skip hint immediately
    const hint = document.createElement("p");
    hint.className = "skip-hint";
    hint.textContent = ">> PRESS ANY KEY OR CLICK TO SKIP BOOT_SEQUENCE";
    loadingScreen.appendChild(hint);

    bootLines.forEach((line) => {
      let t = setTimeout(() => {
        const p = document.createElement("p");
        // Colorize the [ OK ] tags
        p.innerHTML = line.t.replace(
          "[ OK ]",
          "<span style='color:#00ff00'>[ OK ]</span>",
        );
        loadingScreen.insertBefore(p, hint); // Keep hint at the bottom
        loadingScreen.scrollTop = loadingScreen.scrollHeight;

        if (line.t.includes("SYSTEM READY")) {
          setTimeout(finishBoot, 800);
        }
      }, line.d);
      bootTimeouts.push(t);
    });

    window.addEventListener("keydown", skipBoot, { once: true });
    window.addEventListener("click", skipBoot, { once: true });
  }

  function skipBoot() {
    bootTimeouts.forEach(clearTimeout);
    finishBoot();
  }

  function finishBoot() {
    const loadingScreen = document.getElementById("loading-screen");
    const mainContent = document.getElementById("main-content");

    if (loadingScreen) loadingScreen.style.display = "none";

    if (mainContent) {
      mainContent.style.display = "block";
      mainContent.classList.add("power-on-anim");
    }

    window.loadModule("system_audit");

    const f1 = document.querySelector('[data-module="system_audit"]');
    if (f1) f1.classList.add("active");
  }

  /* SYSTOHC */
  function updateClocks() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Target all elements with the class 'sys-clock'
    const clocks = document.querySelectorAll(".sys-clock");

    clocks.forEach((clock) => {
      clock.textContent = timeString;
    });
  }

  // Run every second
  setInterval(updateClocks, 1000);
  updateClocks(); // Initial call

  // --- 4. THE FAIL-SAFE CLICK LISTENER ---
  document.addEventListener("click", (e) => {
    const item = e.target.closest(".nav-item, .file-link");
    if (!item) return;

    const mod = item.getAttribute("data-module");

    if (mod === "resume") {
      e.preventDefault();
      e.stopPropagation();
      window.open("./assets/tSexton_Resume.pdf", "_blank");
      return;
    }

    if (mod) {
      e.preventDefault();
      e.stopPropagation();

      // Only update the active state for the top nav keys //
      if (item.classList.contains("nav-item")) {
        document
          .querySelectorAll(".nav-item")
          .forEach((n) => n.classList.remove("active"));
        item.classList.add("active");
      }
      window.loadModule(mod);
    }
  });

  startBoot();
  setInterval(updateClocks, 1000);
  updateClocks();
});
