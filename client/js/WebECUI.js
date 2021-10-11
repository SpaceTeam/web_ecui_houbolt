function initWebECUI()
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

initWebECUI();
