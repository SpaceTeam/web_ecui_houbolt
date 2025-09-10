let ecuiConfig = {};
$.get('/web_config/main', function(data) {
    //console.log("default");
    //console.log("default:", data);
    ecuiConfig = data;
    let ecuiTitle = ecuiConfig["title"];
    if (ecuiTitle != "" || ecuiTitle != undefined)
    {
        $("#subtitle").text(ecuiTitle);
    }
});

async function initWebECUI()
{
    let themeSwitcherContainer = $(`<div class="themeSwitcher"></div>`).appendTo($(document.body));
    initThemes(themeSwitcherContainer, "theming/", [{theme: "darkTheme", icon: "moon", type: "dark"},{theme: "lightTheme", icon: "brightness-high", type: "light"}]);

    themeSubscribe($("#icon"), function(event){logoThemeHandler(event)});

    handleUrlParams(window.location);

    if (params["stream"]) {
        loadStreamTheme();
    }
}

function logoThemeHandler(event)
{
    if (event.detail["type"] == "light")
    {
        $("#icon").attr("src", "img/Space_Team_Logo_black.png");
    }
    else if (event.detail["type"] == "dark")
    {
        $("#icon").attr("src", "img/Space_Team_Logo_white.png");
    }
    else
    {
        printLog("info", `Tried setting logo type that doesn't exist: ${type}`);
    }
}

let commandsPopupOpen = false;
function toggleEcuiCommandsPopup(button)
{
    let popup = document.getElementById("ecui-commands-popup");
    if (commandsPopupOpen) {
        button.classList.remove("active");
        popup.style.display = "none";
        commandsPopupOpen = false;
    }
    else {
        button.classList.add("active");
        popup.style.removeProperty("display");
        popup.style.transform = `translate(-${(popup.offsetWidth - button.offsetWidth) / 2}px, 5px)`
        commandsPopupOpen = true;
    }
}

var params = {};

function handleUrlParams(url)
{
    let urlParams = new URL(url.toLocaleString()).searchParams;
    if (urlParams.get("spectator") != undefined) {
        params["spectator"] = true;
    }
    else {
        params["spectator"] = false;
    }


    if (urlParams.get("stream") != undefined) {
        params["stream"] = true;
    }
    else {
        params["stream"] = false;
    }
}

function loadStreamTheme() {
    console.log("Loading stream theme");
    let head = document.getElementsByTagName('HEAD')[0];
    let link = document.createElement('link');

    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'css/streamTheme.css';

    head.appendChild(link);
}

initWebECUI();
