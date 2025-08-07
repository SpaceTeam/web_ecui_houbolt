let ecuiConfig = {};
$.get('/web_config/main', function(data) {
    //console.log("default");
    //console.log("default:", data);
    ecuiConfig = data;
    let ecuiTitle = ecuiConfig["title"];
    console.log("ecui config", ecuiConfig);
    if (ecuiTitle != "" || ecuiTitle != undefined)
    {
        console.log("setting ecui title", ecuiTitle);
        $("#subtitle").text(ecuiTitle);
    }
});

async function initWebECUI()
{


    let themeSwitcherContainer = $(`<div class="themeSwitcher"></div>`).appendTo($(document.body));
    initThemes(themeSwitcherContainer, "theming/", [{theme: "darkTheme", icon: "moon", type: "dark"},{theme: "lightTheme", icon: "brightness-high", type: "light"}]);

    themeSubscribe($("#icon"), function(event){logoThemeHandler(event)});
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

initWebECUI();
