package org.fischman.alex.roller;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.Toast;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;
public class MainActivity extends AppCompatActivity {
   private static final String TAG = "ROLLER";
   private static final int BT_ENABLE_REQUEST = 1;
   private static final int PERMISSION_CODE = 2;
   private BluetoothManager manager;
   private BluetoothAdapter adapter;
   private BluetoothDevice piDevice;
   private BluetoothSocket piSocket;
   private OutputStream piOS;
   private void customLengthToast(String string, int millis) {
       final Toast toast = Toast.makeText(this, string, Toast.LENGTH_LONG);
       toast.show();
       Handler handler = new Handler();
       handler.postDelayed(new Runnable() {
           @Override
           public void run() {toast.cancel();}
       }, millis);
   }
   private void writeToPI(byte[] b) {
       Log.e(TAG, "Is the socket connected? " + piSocket.isConnected());
       if (piSocket.isConnected()) {
           try {
               piOS.write(b);
               piOS.flush();
           } catch (IOException e) {
               throw new RuntimeException(e);
           }
       } else {
           initializeBluetooth();
       }
   }
   private void permissionsAndInitialize() {
       String[] perms = new String[]{
               android.Manifest.permission.BLUETOOTH,
               android.Manifest.permission.BLUETOOTH_ADMIN,
            android.Manifest.permission.ACCESS_COARSE_LOCATION,
              android.Manifest.permission.ACCESS_FINE_LOCATION
       };
       for (int i = 0; i < perms.length; ++i) {
           if (ContextCompat.checkSelfPermission(this, perms[i])
                   != PackageManager.PERMISSION_GRANTED) {
               ActivityCompat.requestPermissions(this,
                       new String[]{perms[i]},
                       PERMISSION_CODE);
               return;
           }
       }
       initializeControls();
       initializeBluetooth();
   }
   @Override
   protected void onCreate(Bundle savedInstanceState) {
       super.onCreate(savedInstanceState);
       setContentView(R.layout.activity_main);
       permissionsAndInitialize();
   }
   @Override
   public void onRequestPermissionsResult(int requestCode, String permissions[], int[] grantResults) {
       Log.e(TAG, "onRequestPR: " + requestCode);
       switch (requestCode) {
           case PERMISSION_CODE: {
               // If request is cancelled, the result arrays are empty.
               if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                   permissionsAndInitialize();
               } else {
                   Log.e(TAG, "REJECTED PERMISSION!");
               }
               return;
           }
           default:
               Log.wtf(TAG, "Unexpected permission result request code: " + requestCode);
       }
   }
   @Override
   protected void onActivityResult(int requestCode, int resultCode, Intent data) {
       if (requestCode == BT_ENABLE_REQUEST) {
           if (resultCode == RESULT_CANCELED) {
               Toast.makeText(this, "Bluetooth not opened, try again", Toast.LENGTH_LONG).show();
           }
           initializeBluetooth();
       }
   }
   private void initializeBluetooth() {
       manager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
       adapter = manager.getAdapter();
       //Make sure Bluetooth is available on the device and that it's enabled
       if (adapter == null || !adapter.isEnabled()) {
           Intent enableBT = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
           startActivityForResult(enableBT, BT_ENABLE_REQUEST);
           return;
       }
       piDevice = adapter.getRemoteDevice("B8:27:EB:A9:BE:07");
       Log.e(TAG, "piDevice: " + piDevice.describeContents() + ", " + piDevice.getType() + ", " + piDevice.getBluetoothClass());
       try {
           piSocket = piDevice.createRfcommSocketToServiceRecord(UUID.fromString("94f39d29-7d6d-437d-973b-fba39e49d4ee"));
           Log.e(TAG, "piSocket: " + piSocket);
           piSocket.connect();
           Log.e(TAG, "piSocket: " + piSocket.isConnected());
           piOS = piSocket.getOutputStream();

       } catch (IOException e) {
           throw new RuntimeException(e);
       }
   }
   private void initializeControls() {
       final ImageButton forward = (ImageButton) findViewById(R.id.moveForward);
       final ImageButton backward = (ImageButton) findViewById(R.id.moveBackward);
       final ImageButton right = (ImageButton) findViewById(R.id.turnRight);
       final ImageButton left = (ImageButton) findViewById(R.id.turnLeft);
       final ImageView joystick = (ImageView) findViewById(R.id.circleImage);
       forward.setOnTouchListener(new View.OnTouchListener() {
           @Override
           public boolean onTouch(View v, MotionEvent event) {
               int eventAction = event.getAction();
               if (eventAction == MotionEvent.ACTION_MOVE || eventAction == MotionEvent.ACTION_DOWN) {
                   setMotors(500, 500);
               } else {
                   setMotors(0, 0);
               }
               return true;
           }
       });
       backward.setOnTouchListener(new View.OnTouchListener() {
           @Override
           public boolean onTouch(View v, MotionEvent event) {
               int eventAction = event.getAction();
               if (eventAction == MotionEvent.ACTION_MOVE || eventAction == MotionEvent.ACTION_DOWN) {
                   setMotors(-500, -500);
               } else {
                   setMotors(0, 0);
               }
               return true;
           }
       });
       right.setOnTouchListener(new View.OnTouchListener() {
           @Override
           public boolean onTouch(View v, MotionEvent event) {
               int eventAction = event.getAction();
               if (eventAction == MotionEvent.ACTION_MOVE || eventAction == MotionEvent.ACTION_DOWN) {
                   setMotors(500, 0);
               } else {
                   setMotors(0, 0);
               }
               return true;
           }
       });
       left.setOnTouchListener(new View.OnTouchListener() {
           @Override
           public boolean onTouch(View v, MotionEvent event) {
               int eventAction = event.getAction();
               if (eventAction == MotionEvent.ACTION_MOVE || eventAction == MotionEvent.ACTION_DOWN) {
                   setMotors(0, 500);
               } else {
                   setMotors(0, 0);
               }
               return true;
           }
       });
       joystick.setOnTouchListener(new View.OnTouchListener() {
           @Override
           public boolean onTouch(View v, MotionEvent event) {
               int eventAction = event.getAction();
               if (eventAction == MotionEvent.ACTION_MOVE || eventAction == MotionEvent.ACTION_DOWN) {
                   int width = joystick.getWidth();
                   int height = joystick.getHeight();
                   float touchX = event.getX() - width / 2;
                   float touchY = event.getY() - height / 2;
                   if (Math.sqrt(Math.pow(touchX, 2) + Math.pow(touchY, 2)) < 450) {
                       int joystickX = (int) touchX;
                       int joystickY = -1 * (int) touchY;
                       setMotors(Math.round((joystickX + joystickY) / 100) * 100, Math.round((joystickX * -1 + joystickY) / 100) * 100);
                   }
               } else {
                   setMotors(0, 0);
               }
               return true;
           }
       });
   }
   public void setMotors(int m1, int m2) {
       //User feedback
       customLengthToast(Integer.toString(m1) + ", " + Integer.toString(m2), 1);
       //Bluetooth to Pi
       writeToPI(new byte[]{(byte) (m1 / 10 + 50), (byte) (m2 / 10 + 50), 'm'});
   }
   public void close() {
       try {
           piOS.write(new byte[]{'q'});
           piOS.flush();
           piOS.close();
       } catch (IOException e) {
           throw new RuntimeException(e);
       }
   }
   @Override
   public void onDestroy() {close();  super.onDestroy();}

