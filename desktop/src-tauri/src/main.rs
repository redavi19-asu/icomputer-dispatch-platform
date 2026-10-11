use tauri::{WebviewUrl, WebviewWindowBuilder};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let url = "https://redavi19-asu.github.io/icomputer-dispatch-platform/auth"
                .parse()
                .expect("valid Urban Carrier OS production URL");

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("Urban Carrier OS")
                .inner_size(1440.0, 900.0)
                .min_inner_size(980.0, 680.0)
                .resizable(true)
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Urban Carrier OS desktop");
}
