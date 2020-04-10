Miniflux Checker
================
Miniflux Checker is a Firefox WebExtension that tracks unread items in a [Miniflux RSS reader](https://miniflux.app) account. Specifically, it does the following:

* Provides a toolbar icon that indicates the number of unread feed items
* Creates desktop notifications when new items are detected

Setup
-----
1. Install Miniflux Checker either from its [addons.mozilla.org listing](https://addons.mozilla.org/en-US/firefox/addon/miniflux-checker/) or its [GitHub page](https://github.com/willsALMANJ/miniflux-checker).
2. Open the extension's preferences page from Addons manager and set the Miniflux URL and credentials. A token is preferred over username and password, see usage notes.
3. Place the toolbar icon in a visible location if you want to see the number of unread items.

Usage notes
-----------
* Clicking the toolbar icon checks Miniflux for an update of the unread count and triggers notifications of any new items.
  - It only checks the current Miniflux state. It does not trigger Miniflux to refresh its feed data.
* The time between checks of the Miniflux state can be set in the preferences.
* Notifications can be disabled in the preferences.
* The maximum number of notifications shown in one check can be set in the preferences. If there are more, a final notification is shown with the number of additional new items. This behavior is used to avoid a flood of notifications from a noisy feed.
* Notifications use the feed's favicon by default. In preferences, one can select to the Miniflux Checker icon for all notifications instead.
* The last updated item's ID is stored internally. Only one notification should ever be shown for a given item.
  - This ID can be reset in the preferences in case the Miniflux account changes.
* The password is stored in the extension's local storage, effectively in clear text on the file system.

Ideas for future features
-------------------------
Miniflux Checker meets the author's original design goals, but here are some ideas for other features that could be added:

* Reuse the credentials of a current browser session so no credentials need to be stored in preferences.
* Open the Miniflux page from a notification or from the toolbar icon.
* Show popup listing of unread items when clicking on toolbar icon.
* Trigger refresh of Miniflux feeds when checking Miniflux.
* Mark iems read from notifications or from the toolbar icon.

References
----------
* [Miniflux](https://miniflux.app)
* Miniflux Notifications ([Google Play](https://chrome.google.com/webstore/detail/miniflux-notifications/jpeplhckmjlpahnkpblakfligkbfefkg), [GitHub](https://github.com/modInfo/miniflux-chrome-notifier))
  - This project was only discovered after Minflux Checker was written. Otherwise, that project would have been ported to Firefox rather than creating a separate project. The Firefox Add-ons site was searched before writing Miniflux Checker but not the Chrome store. The feature request for in-client notifications was also monitored but nothing was posted there.
* Miniflux Checker (this project) ([Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/miniflux-checker/), [GitHub](https://github.com/willsALMANJ/miniflux-checker))
