# 340CT Coursework
## File Sharing

This is the repository for my 340CT Coursework, it is a dynamic website that allows users to upload, download, and share files between one another.

The code provided allows you to run the site as a server. Currently the server is set up to run as a local host site on port 8080.
In order to run the server you must follow these instructions:
1. Download the repository/Clone the repository
2. Run the 'npm install' command to install the required dependencies as listed in the package.json file
3. Run index.js using Node.js
4. Connect to the site by going to http://localhost:8080/

The website is based off of the template provided by Mark Tyers which can be found
[here](https://github.coventry.ac.uk/web/template-dynamic-websites), however all
functionality beyond what is provided by the template is my own work.

If you wish to see a full log of all releases the list of releases on GitHub. However, you can see below the list of features outlined by the coursework specification, along with which version they were implemented in.

## Outline of Assigned Tasks
### Basic

1. Allow logged-in users to upload files to the server \[Implemented in Release v0.1\]
2. They should be able to email a link to their friends who can use this to download the file \[Implemented in Release v0.1\]
3. The files should not be stored in the public directory \[Implemented in Release v0.1\]
4. The download link should include a hash string, not the file name \[Implemented in Release v0.1\]

### Intermediate

1. Any files should be deleted once they have been downloaded or after 3 days (whichever comes first) \[Implemented in Release v0.2\]
2. All files should download (even if they could display in the web browser) \[Implemented in Release v0.1\]

### Advanced

1. The person uploading the file can choose the username of the user who can access it \[Implemented in Release v0.3\]
2. This username must already exist \[Implemented in Release v0.3\]
3. Users need to log in to see a list of the files they can download \[Implemented in Release v0.3\]
4. All files in the list should have an appropriate icon reflecting what type of file they are and include information such as the file size and the date and time the file was uploaded as well as how long before it will be deleted \[Implemented in Release v0.3\]
