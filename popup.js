document.addEventListener("DOMContentLoaded", function () {
    // One-Click Cleanup
    document.getElementById("cleanup").addEventListener("click", function () {
        chrome.tabs.query({}, function (tabs) {
            let tabsToClose = tabs.filter(tab => !tab.pinned && !tab.active).map(tab => tab.id);
            if (tabsToClose.length > 0) {
                chrome.tabs.remove(tabsToClose);
            }
        });
    });

    // Group Similar Tabs
    document.getElementById("groupTabs").addEventListener("click", function () {
        console.log("Grouping tabs...");
        chrome.tabs.query({ currentWindow: true }, function (tabs) {
            let domainGroups = new Map();

            tabs.forEach(tab => {
                try {
                    let url = new URL(tab.url);
                    let domain = url.hostname;
                    if (!domainGroups.has(domain)) domainGroups.set(domain, []);
                    domainGroups.get(domain).push(tab.id);
                } catch (e) {
                    console.error("Invalid URL:", tab.url);
                }
            });

            domainGroups.forEach((tabIds, domain) => {
                if (tabIds.length > 1) {
                    chrome.tabs.group({ tabIds: tabIds }, (groupId) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error grouping:", chrome.runtime.lastError.message);
                        } else {
                            chrome.tabGroups.update(groupId, { title: domain, color: "blue" });
                        }
                    });
                }
            });
        });
    });

    // Save Tab Session
    document.getElementById("saveSession").addEventListener("click", function () {
        console.log("Saving session...");
        chrome.tabs.query({ currentWindow: true }, function (tabs) {
            let sessionData = tabs.map(tab => tab.url);
            chrome.storage.local.set({ savedSession: sessionData }, function () {
                if (chrome.runtime.lastError) {
                    console.error("Error saving session:", chrome.runtime.lastError);
                } else {
                    console.log("Session saved!", sessionData);
                    updateSessionList();
                }
            });
        });
    });

    // Restore Tab Session
    document.getElementById("restoreSession").addEventListener("click", function () {
        console.log("Restoring session...");
        chrome.storage.local.get("savedSession", function (data) {
            if (data.savedSession && data.savedSession.length > 0) {
                data.savedSession.forEach(url => chrome.tabs.create({ url: url }));
            } else {
                console.log("No session found.");
            }
        });
    });

    // Display Saved Sessions
    function updateSessionList() {
        chrome.storage.local.get("savedSession", function (data) {
            let sessionList = document.getElementById("sessionList");
            sessionList.innerHTML = "";

            if (data.savedSession && data.savedSession.length > 0) {
                data.savedSession.forEach((url, index) => {
                    let listItem = document.createElement("li");
                    listItem.textContent = `Tab ${index + 1}: ${url}`;
                    sessionList.appendChild(listItem);
                });
            }
        });
    }

    // Load session list on popup open
    updateSessionList();
});
document.getElementById("searchTabs").addEventListener("input", function () {
    let query = this.value.toLowerCase(); // Get user input

    if (query.length === 0) return; // If empty, do nothing

    chrome.tabs.query({}, function (tabs) {
        let matchedTabs = tabs.filter(tab => 
            tab.title.toLowerCase().includes(query) || tab.url.toLowerCase().includes(query)
        );

        if (matchedTabs.length > 0) {
            // Find the best match (if Gmail is searched, move to Gmail tab directly)
            let exactMatch = matchedTabs.find(tab => tab.title.toLowerCase().startsWith(query));
            
            if (exactMatch) {
                chrome.tabs.update(exactMatch.id, { active: true }); // Switch to best match
            } else {
                chrome.tabs.update(matchedTabs[0].id, { active: true }); // Otherwise, switch to first result
            }
        }
    });
});

