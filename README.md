# angular2 edu-sharing modules

This project was generated with [angular-cli](https://github.com/angular/angular-cli) version 1.0.0-beta.8.


## Development server

After cloning from git, run `npm install`. Then run `ng serve` for a live dev server. Navigate to `http://localhost:4200/`. On some systems to need to install angular-cli globally to make it work - so run `npm install -g angular-cli` and then try `ng serve` again.

When running the live server the app will automatically reload if you change any of the source files. 

To make the API calls work you may need to add your local edu-sharing dev server url/path to the `possibleApiEndpoints` string array in the `src/app/edu-api.service.ts` file. 


## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.


## Deploy to edu-sharing base project

Within edu-sharing base project make sure you have set the path to this local code base in your build.USER.properties file. 

Example `angular.ccdesktop=/Users/rotzoll/Documents/GitWorkspace/ang2-edusharing`

Than open the `build-common.xml` ANT file. Start the `deploy-angular-app` task and follow given directions.