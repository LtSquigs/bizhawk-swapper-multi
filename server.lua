check_interval = 60 -- check every second (60frames)
current_interval = 0
unprocessed_messages = ""

if userdata.get("unprocessed_messages") ~= nil then
  unprocessed_messages = userdata.get("unprocessed_messages")
end

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

for message in string.gmatch(unprocessed_messages, "([^\r\n]+)\r\n") do
  message_length = string.len(message)
  unprocessed_messages = string.sub(unprocessed_messages, message_length + 1)

  process_message(message)
end

while true do -- The main cycle that causes the emulator to advance and trigger a game switch.
  if current_interval > check_interval then
      messages = comm.socketServerResponse()
      if messages ~= nil then
        unprocessed_messages = messages
        userdata.set("unprocessed_messages", unprocessed_messages)

        for message in string.gmatch(messages, "([^\r\n]+)\r\n") do
         message_length = string.len(message)
         unprocessed_messages = string.sub(unprocessed_messages, message_length + 1)
         userdata.set("unprocessed_messages", unprocessed_messages)

         process_message(message)
        end
      end
  end

  current_interval = current_interval + 1

	emu.frameadvance()
end
