# UI screenshots

Scope: redesigned home and shared responsive navigation. Existing page and dialog content retained.

Open [gallery.html](gallery.html) to browse all screenshots.

- [Home · campaign featured](26-home-player-card.png): Fewer than 100 connected players: the yellow campaign card takes the lead.
- [Home · multiplayer featured](29-home-multiplayer-player-card.png): 100 or more connected players: multiplayer moves into the green feature card.
- [Solo levels](03-solo.png): Existing solo browser with the shared sidebar.
- [Rankings](04-rankings.png): Existing rankings page with the shared sidebar.
- [Admin](05-admin.png): Existing dashboard with the shared sidebar.
- [Level editor](06-level-editor.png): Existing editor fitted into the space beside the sidebar.
- [Campaign editor](07-campaign-editor.png): Existing campaign editor with the shared sidebar.
- [Home · wide desktop](27-home-wide-player-card.png): The home fills the available space, with the footer centered across the full page at the bottom.
- [Home · mobile](28-home-mobile-player-card.png): Compact, scrollable navigation and a stacked home layout at 390px.
- [Campaign selector](09-campaign-selector.png): The featured campaign card opens the existing campaign selector.
- [Multiplayer selector](10-multiplayer-selector.png): Multiplayer remains available through its secondary card.
- [My levels](11-my-levels.png): The sidebar opens the existing level manager, including from an editor.
- [My campaigns](12-my-campaigns.png): The sidebar opens the existing campaign manager.

Verification: 257 web unit tests passed across the full web suite and the new editor scaling tests; web type checking, lint (warnings only), build and formatting passed. Browser checks used the running local app and real socket connections to verify both featured modes, navigation, dialogs, responsive home layout and editor fitting.
