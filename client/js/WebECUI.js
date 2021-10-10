function initWebECUI()
{
    let themeSwitcherContainer = $(`<div class="themeSwitcher"></div>`).appendTo($(document.body));
    initThemes(themeSwitcherContainer, "theming/", [{theme: "lightTheme", icon: "brightness-high", type: "light"},{theme: "darkTheme", icon: "moon", type: "dark"}]);
}

initWebECUI();
