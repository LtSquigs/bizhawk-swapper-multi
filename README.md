# bizhawk-swapper-multi

Based off Brossentia's shuffle script, but built for Multiplayer co-op

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
11. When all players are ready and the # of ROMs selected = the # of players, the Host can hit the "Run Games" button to start the games running and swapping!
  - The number of games selected to be run must be equal to the number of players
  
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
  
You can also use the "Resume From Last Save" function to prepare a save state in advanced if you want to avoid the title screen/initial setup of a game.
The system looks for saves with the name structure `<romFileName>.save` in the `Saves` directory.

e.g. `Saves\Super Mario World.sfc.save` would be the last known save for the rom `Super Mario World.sfc`

# TODO

List of things that may eventually be added to this system:

1. The ability to run less or more roms than the number of players (Would some players just have a black screen?)
2. The ability to run without shuffle, and manually control the game swaps
3. UI To display which player is playing which ROM
4. Add Countdown feature from Brossentia's Script
5. The ability to mark a ROM as "completed" and taken out of rotation (Requires #1)
