print('This is the socket server for the shuffler, do not close the LUA dialog box please.');

check_interval = 60 -- check every second (60frames)
current_interval = 0

function process_message(message)
  id, type, arg = string.match(message, "([^;]+);([^;]+);(.*)")

  if type == 'open_rom' then
    print("Opening Rom")
    client.openrom(string.sub(arg, 1, -2))
    comm.socketServerSend(id .. ';rom_loaded')
  end

  if type == 'save_state' then
    print("Saving State")
    savestate.save(string.sub(arg, 1, -2))
    comm.socketServerSend(id .. ';state_saved')
  end

  if type == 'load_state' then
    print("Loading State")
    savestate.load(string.sub(arg, 1, -2))
    comm.socketServerSend(id .. ';state_loaded')
  end
end

while true do -- The main cycle that causes the emulator to advance and trigger a game switch.
  if current_interval > check_interval then
      messages = comm.socketServerResponse()
      if messages then
        for message in string.gmatch(messages, "([^\r\n]+)\r\n") do
         process_message(message)
        end
      end
  end

  current_interval = current_interval + 1

	emu.frameadvance()
end
