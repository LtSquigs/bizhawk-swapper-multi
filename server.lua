check_interval = 60 -- check every second (60frames)
current_interval = 0
unprocessed_messages = ""
countdown = 0

if userdata.get("unprocessed_messages") ~= nil then
  unprocessed_messages = userdata.get("unprocessed_messages")
end

function process_message(message)
  id, type, arg = string.match(message, "([^;]+);([^;]+);(.*)")

  if type == 'open_rom' then
    print("Opening Rom")
    client.openrom(string.sub(arg, 1, -2))
    comm.socketServerSend(id .. ';rom_loaded;0;\r\n')
  end

  if type == 'save_state' then
    print("Saving State")
    savestate.save(string.sub(arg, 1, -2))
    comm.socketServerSend(id .. ';state_saved;0;\r\n')
  end

  if type == 'load_state' then
    print("Loading State")
    savestate.load(string.sub(arg, 1, -2))
    comm.socketServerSend(id .. ';state_loaded;0;\r\n')
  end

  if type == 'start_countdown' then
    print("Starting Countdown")
    countdown = 4
    comm.socketServerSend(id .. ';countdown_started;0;\r\n')
  end
end

for message in string.gmatch(unprocessed_messages, "([^\r\n]+)\r\n") do
  message_length = string.len(message)
  unprocessed_messages = string.sub(unprocessed_messages, message_length + 1)

  process_message(message)
end

-- Note: Countdown code mostly copied from other swapper, sorry, your code is too good
buffer = 0 -- Sets countdown location. Adding 8 makes it appear correct for the NES.
if emu.getsystemid() == "NES" then
	buffer = 8
end

function doCountdown() -- Draws the countdown box and text
	gui.drawBox(client.bufferwidth()/2-60,buffer,client.bufferwidth()-(client.bufferwidth()/2+1-60),15+buffer,"white","black")
	if countdown == 1 then
		gui.drawText(client.bufferwidth()/2,buffer,"!.!.!.ONE.!.!.!","red",null,null,null,"center")
	elseif countdown == 2 then
		gui.drawText(client.bufferwidth()/2,buffer,"!.!...TWO...!.!","yellow",null,null,null,"center")
	elseif countdown == 3 then
		gui.drawText(client.bufferwidth()/2,buffer,"!....THREE....!","lime",null,null,null,"center")
	end
end

while true do -- The main cycle that causes the emulator to advance and trigger a game switch.
  if countdown > 0 then
    doCountdown()
  end

  if current_interval > check_interval then
      messages = comm.socketServerResponse()
      if messages ~= "" then
        unprocessed_messages = messages
        userdata.set("unprocessed_messages", unprocessed_messages)

        for message in string.gmatch(messages, "([^\r\n]+)\r\n") do
         message_length = string.len(message)
         unprocessed_messages = string.sub(unprocessed_messages, message_length + 1)
         userdata.set("unprocessed_messages", unprocessed_messages)

         process_message(message)
        end
      end

      if countdown > 0 then
        countdown = countdown - 1;
      end

      current_interval = 0
  end

  current_interval = current_interval + 1

	emu.frameadvance()
end
