from __future__ import print_function
import time
from pololu_drv8835_rpi import motors, MAX_SPEED
from bluetooth import *
import struct

def reciever(client_sock):
    motorspeeds = []
    try:
        while True:
            data = client_sock.recv(1024)
            for i in data:
                if i == "q": return
                elif i == "m":
                    print ("received: %s" % motorspeeds)
                    if len(motorspeeds) == 2:
                        motors.setSpeeds(-motorspeeds[0], motorspeeds[1])
                    motorspeeds = []
                else:
                    i = struct.unpack('B', i)[0]
                    motorspeeds.append(int((i - 50) * 5))
    except IOError:
        pass

def oneshot():
    server_sock = BluetoothSocket(RFCOMM)
    server_sock.bind(("",PORT_ANY))
    server_sock.listen(1)
    port = server_sock.getsockname()[1]
    uuid = "94f39d29-7d6d-437d-973b-fba39e49d4ee"

    advertise_service(server_sock, "SampleServer", service_id = uuid, service_classes = [ uuid, SERIAL_PORT_CLASS ], profiles = [ SERIAL_PORT_PROFILE ], 
    #protocols = [OBEX_UUID]
    )               
    print("Waiting for connection on RFCOMM channel %d" % port)

    try:
        client_sock, client_info = server_sock.accept()
        print("Accepted connection from ", client_info)
        reciever(client_sock)
    finally:
        motors.setSpeeds(0, 0)
        client_sock.close()
        print("disconnected")
        server_sock.close()
        print("all done")
