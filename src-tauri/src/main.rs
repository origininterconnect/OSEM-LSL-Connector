use std::sync::{Arc, Mutex};
use std::sync::mpsc::{self, Sender};
use tauri::{AppHandle};
use lsl::{StreamInfo, StreamOutlet};
use lsl::Pushable;
lazy_static::lazy_static! {
    static ref TX: Mutex<Option<Sender<Vec<i32>>>> = Mutex::new(None);
}

#[tauri::command]
async fn start_streaming(channel_data: Vec<i32>, _app_handle: AppHandle) {
    println!("Received data: {:?}", channel_data);

    // Send data to the channel
    if let Some(tx) = TX.lock().unwrap().as_ref() {
        if let Err(err) = tx.send(channel_data) {
            println!("Failed to send data to LSL thread: {:?}", err);
        }
    }
}

fn main() {
    // Create a channel for continuous communication
    let (tx, rx) = mpsc::channel::<Vec<i32>>();
    *TX.lock().unwrap() = Some(tx);

    // Create StreamInfo and StreamOutlet
    std::thread::spawn(move || {
        let info = Arc::new(
            StreamInfo::new(
                "ORIC-OSEM",
                "EXG",
                8,
                2000.0,
                lsl::ChannelFormat::Int32,
                "oric",
            )
            .unwrap(),
        );
        let outlet = Arc::new(Mutex::new(StreamOutlet::new(&info, 0, 360).unwrap()));

        while let Ok(channel_data) = rx.recv() {
            if let Ok(outlet) = outlet.lock() {
                outlet.push_sample(&channel_data).unwrap_or_else(|e| {
                    println!("Failed to push data to LSL: {:?}", e);
                });
            }
        }
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_streaming])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
