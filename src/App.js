import React, { useState } from 'react';
import './App.css';
import * as tus from "tus-js-client";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getTicket = async () => {
  const response = await fetch(window.appState.config.apiUrls.apiweb + "fileupload-start.tus", {
    method: 'POST',
    credentials: 'include',
  })

  return response.json();
}

const resolveCrl = async (id) => {
  const response = await fetch(window.appState.config.apiUrls.apiweb + "fileupload-resolve.tus?id=" + id, {
    method: 'POST',
    credentials: 'include',
  })

  const json = await response.json();

  if (json.preparing) {
    // Retry 2 seconds later if the crl is not ready
    return sleep(2000).then(() => resolveCrl(id));
  }

  return json.crl;
}

function App() {
  const [logtext, setLogText] = useState("");

  const upload = async (e) => {
    // Get the selected file from the input element
    // Do this before we start the async stuff
    var file = e.target.files[0]

    // Token contains an id and a url
    const uploadTicket = await getTicket();

    // Create a new tus upload
    var upload = new tus.Upload(file, {
      endpoint: uploadTicket.url,

      metadata: {
        filename: file.name,
        filetype: file.type
      },
      onBeforeRequest: function (req) {
        var xhr = req.getUnderlyingObject()
        xhr.withCredentials = true
      },
      onError: function (error) {
        console.log("Failed because: " + error)
        setLogText("Failed because: " + error + "\n");
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        var percentage = (bytesUploaded / bytesTotal * 100).toFixed(2)
        console.log(bytesUploaded, bytesTotal, percentage + "%")
        setLogText(bytesUploaded + "/" + bytesTotal + " " + percentage + "%\n");
      },
      onSuccess: async function () {
        console.log("Uploaded %s to %s", upload.file.name, upload.url)
        setLogText("Uploaded " + upload.file.name + " to " + upload.url + "%\n");

        const crl = await resolveCrl(uploadTicket.id);
        setLogText("Uploaded file became the following crl " + crl);
      }
    });

    upload.start();
  };

  return (
    <div className="App">
      <div>
        <input type="file" onChange={upload} />
      </div>
      <div>
        <textarea style={{ width: "75vw", height: "30em" }} value={logtext} readOnly></textarea>
      </div>
    </div>
  );
}

export default App;
