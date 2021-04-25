# bizhawk-swapper-multi

Based off Brossentia's shuffle script, but built for Multiplayer co-op

**Note: Even though this is built for multiplayer, it also works as a single player swapper.**

# What is This

This tool lets you play any roms that BizHawk can run with your friends online, swapping who is playing which game randomly as you play them.

e.g. Im playing Super Mario World, your playing Kirby. Now randomly Im playing Kirby where you just were, and your playing Super Mario World where I was.

# How to Setup

1. Download the Latest Release package from the [Release Page](https://github.com/LtSquigs/bizhawk-swapper-multi/releases)
  - The release application comes with a working copy of BizHawk. If you want to use your own Copy of BizHawk, delete the BizHawk folder in the unzipped file. The application will ask you which BizHawk folder you want when you launch it.
2. Add the ROM Files you want to be able to swap with friends into the SwapRoms folder
  - Each person must have copies of the roms in their own SwapRoms folder, and they must have the same name
3. Launch the Bizhawk Swapper exe
4. You will be prompted if you want to be the Host or a Cient. The Host controls the settings and which games are run.
5. To host: Enter your Username and hit the Host Button.
  - The host may have to forward port 45454 on your router to allow clients in
6. To connect as a Client: Enter your username and the hosts IP address and hit connect.
  - Every client must have a different username or it all breaks
7. You will launch into the settings page, here the hosts can change what settings they want and players can see the connection status of other players.
8. Once ready to play, each player must hit the Launch BizHawk button. This will launch the BizHawk instance and connect it to the application.
  - Do not close the LUA Script window that is opened with BizHawk
9. This is your opportunity to configure BizHawk before the games are run, configure inputs etc.
10. The Host must select which ROMs to play and swap.
11. When all players are ready  the Host can hit the "Run Games" button to start the games running and swapping!
  - If you have more or less games than the number of players, see the section below on rom swapping rules to know how it works

# Settings

The settings on the settings page include:

- Minimum Swap Time
  - The minimum time before a swap can occure
- Maximum Swap Time
  - The maximum time before a swap must occur
- Resume From Last Save
  - If enabled, the swapper system will send the last known Save State for the games selected to the clients on initial load. Allowing you to resume playing over multiple sessions.
- Everyone Swaps
  - If enabled, all players swap together. If disabled, a random subset of players are swapped when a swap occurs.
- Automatic swapping
  - If turned off the automatic swapping will stop, can be turned off and on at any time to stop Swapping
- Countdown
  - If turned on a friendly 3, 2, 1 countdown will display on the emulator, same as the other swapper script.

You can also use the "Resume From Last Save" function to prepare a save state in advanced if you want to avoid the title screen/initial setup of a game.
The system looks for saves with the name structure `<romFileName>.save` in the `Saves` directory.

e.g. `Saves\Super Mario World.sfc.save` would be the last known save for the rom `Super Mario World.sfc`

You can manually swap as well using the Manual Swap button, if automatic swapping is on this will reset the timer but not stop automatic swapping.

# Twitch Integration (Experimental)

The swapper has experimental support for swapping based off of Twitch Bit donations or Channel Point Reward Redemptions. (This is experimental as I do not have an affiliate/partner channel to test it with).

To enable it you can switch to the Twitch settings tab, authenticate against Twitch and change the settings to your requirements. (Note: Authentication may expire and need to be re-done).

The Twitch Integration has the following options:

- Enable Twitch
  - Turns off and on all the twitch features
- Enable Channel Reward Triggering Swap
  - If enabled, the selected Channel Reward will trigger a swap if redeemed while swapper is on
- Enable Bit Donation Triggering Swap
  - If enabled, any donations above the provided bit threshold will trigger a swap while the swapper is on
- Cooldown
  - Cooldown between twitch initiated swaps. If donations/reward redemptions happen within this time since the last swap (including non-twitch based swaps) they will either be ignored or banked depending on the bank setting. 
- Bank Swaps During Cooldown
  - If enabled, any donation/reward redemptions that trigger a swap during the cooldown period will be banked and executed after the cooldown is over.

# Rom Swapping How It Works

When the number of games = the # of players, every person swaps with eachother (unless "Everyone Swaps is unmarked, then some people can not swap").

When you have more Games than the number of players, those games will be swapped in and out randomly.

When you have less games than the number of players (as you mark games as done), than the person who most recently finished their game will be removed from the swap rotation.

e.g. Person A and Person B are playing Game A and Game B respectively with Game C in reserve. If Game B is removed from the rotation, than rotation will continue with just Game A and B.

However if Game C is then removed from the rotation, whoever had Game C last is removed from the rotation, and only the players with "live games" will continue to rotate.

# TODO

List of things that may eventually be added to this system:

1. UI To display which player is playing which ROM
