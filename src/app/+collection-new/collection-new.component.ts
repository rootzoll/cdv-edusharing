import {Component, OnInit, NgZone} from '@angular/core';

import { MD_BUTTON_DIRECTIVES } from '@angular2-material/button';
import { MD_INPUT_DIRECTIVES } from '@angular2-material/input';
import { Router, ActivatedRoute } from '@angular/router';

import { GwtInterfaceService } from '.././gwt-interface.service';

import {TranslateService, TranslatePipe} from 'ng2-translate/ng2-translate';

import { EduApiService } from '.././edu-api.service';
import * as EduData from '.././edu-api.data';

// component class
@Component({
  selector: 'app-collection-new',
  templateUrl: 'app/+collection-new/collection-new.component.html',
  styleUrls: ['app/+collection-new/collection-new.component.css'],
  directives: [
      MD_BUTTON_DIRECTIVES, 
      MD_INPUT_DIRECTIVES
      ],
  providers: [GwtInterfaceService],
  pipes: [TranslatePipe]
})
export class CollectionNewComponent implements OnInit {

    public static SCOPE_MYCOLLECTIONS:number = 0;
    public static SCOPE_MYORGANIZATIONS:number = 1;
    public static SCOPE_ALLCOLLECTIONS:number = 2; 

    private isLoading:boolean = false;
    private isReady:boolean = false;
    
    private paramSubscription:any;
    private lastError:string = null;

    private parentId:string; // if not null --> new collection
    private editId:string; // if not null --> edit collection

    // new collection as state of page until router confusion settles down
    private newCollectionStep:number;
    private newCollectionName:string;
    private newCollectionDescription:string;
    private newCollectionScope:number;
    private newCollectionColor:string;

    // on edit of icon of collection is already set
    private previewIcon:string;

    private imageShow:boolean = false;
    private imageData:string = null;
    private imageFile:File = null;

    // inject services
    constructor(
        public eduApiService:EduApiService,
        public gwtInterface:GwtInterfaceService,
        private route:ActivatedRoute,
        private router: Router,
        private zone: NgZone,
        private translationService:TranslateService) {
    }

    isNewCollection() : boolean {
        return this.editId==null;
    }

    isEditCollection() : boolean {
        return !this.isNewCollection();
    }

    newCollectionCancel() : void {
        var id = this.parentId;
        if (id==null) id = this.editId;
        this.router.navigate(['/collections',{id: id}]);
    }

    newCollectionContinue() : void {

        // input data optimize
        this.newCollectionName = this.newCollectionName.trim();
        this.newCollectionDescription = this.newCollectionDescription.trim();

        // validate input --> TODO: Dialogs or micro interaction later
        if (this.newCollectionName.length==0) {
            this.translationService.get("collectionNew_askName").subscribe( (text) => {
                alert(text);
            });
            return;
        }

        // prepare image data
        this.imageShow = false;
        this.imageData = null;

        // show next stepp
        this.newCollectionStep=2;
    }

    setColor(color:string) : void {
        this.newCollectionColor = color;
    }

    imageDataChanged(event:any) : void {
        
        // get files and check if available
        var files = event.srcElement.files;
        if (typeof files == "undefined") {
            console.log("files = undefined -> ignoring");
            return;
        }
        if (files.length<=0) {
           console.log("files.length = 0 -> ignoring");
            return;
        }

        // get first file
        var file:File = files[0];

        // check if file type is correct
        var validType = false;
        if (file.type=="image/png") validType = true;
        //if (file.type=="image/jpeg") validType = true;
        //if (file.type=="image/gif") validType = true;
        if (!validType) {
            console.log("file.type = "+file.type+" -> not accapted -> ignoring");
            return;   
        }
        
        // remember file for upload 
        this.imageFile = file;

        // read file base64
        var reader  = new FileReader();
        reader.addEventListener("load", () => {
            this.imageData = reader.result;
            //console.log(this.imageData);
            this.imageShow = true;
        });
        reader.readAsDataURL(file);
        
    }

    newCollectionCreate() : void {

        if (this.isEditCollection()) {

            /*
             *  EDIT 
             */

            this.isLoading = true;

            // get fresh collection data
            this.eduApiService.getCollectionMetadata(this.editId).subscribe( collection => {

                // update with user set data
                collection.color = this.newCollectionColor;
                collection.title = this.newCollectionName;
                collection.description = this.newCollectionDescription;

                // null fields that should ne ignored
                collection.owner = null;

                this.eduApiService.updateCollection(collection).subscribe( result => {

                    // update image if needed
                    this.uploadImageIfSetOrChanged(collection, () => {
                        // finally UPDATE PERMISSIONS and than it will navigate to collection
                        this.updateLocalPermissions(collection);
                    });

                }, error => {
                    this.isLoading = false;
                    alert("Sorry, something went wrong. Try again or abort. (2e)");
                });

            }, error => {
                this.isLoading = false;
                alert("Sorry, something went wrong. Try again or abort. (1e)");
            });

            return;

        } else {

            /*
             *  CREATE
             */

            this.isLoading = true;
            this.eduApiService.createCollection(
                this.newCollectionName, 
                this.newCollectionDescription, 
                "-home-", 
                this.parentId, 
                "MY",
                this.newCollectionColor
            ).subscribe( collection => {

                    // update image if set
                    this.uploadImageIfSetOrChanged(collection, () => {
                        // finally UPDATE PERMISSIONS and than it will navigate to collection
                        this.updateLocalPermissions(collection);
                    });

            }, error => {
                this.isLoading = false;
                alert("Sorry, something went wrong. Try again or abort. (1c)");
            });
        }

    }

    // uploads image if needed and calls callback with ...
    // null --> if no image or not changed
    // image url --> if image new or changed
    private uploadImageIfSetOrChanged(collection:EduData.Collection, callbackFunction:any) : void {

             if ((this.imageShow) && (this.imageData!=null) && (this.imageData).startsWith("data:")) {

                 // image new or changed
                 this.eduApiService.uploadCollectionImage(collection.ref.id, this.imageFile, "image/png").subscribe(() => {
                     // WIN
                     callbackFunction();
                 },
                 error => {
                     // FAIL
                     alert("ERROR on setting picture :(");
                     console.log(JSON.stringify(error));
                     callbackFunction();
                 });

             } else {

                 // no image or not changed
                callbackFunction();

             }

    }

    updateLocalPermissions(collection:EduData.Collection) : void {

                // prepare permissions
                var localPermissions : EduData.LocalPermissions = new EduData.LocalPermissions();
                localPermissions.permissions = new Array<EduData.InheritedPermissions>();
                localPermissions.inherited = false;

                if (this.newCollectionScope==EduData.GETCOLLECTIONS_SCOPE.GROUPS) {

                    // get user groups and set all those
                    this.eduApiService.getOrganizations().subscribe( orgaList => {
                        orgaList.forEach( orga => {

                            // add group to local permissions
                            var permission:EduData.InheritedPermissions = new EduData.InheritedPermissions();
                            permission.permission = "Consumer";
                            permission.authority = new EduData.Authority();
                            permission.authority.authorityName = orga.authorityName;
                            permission.authority.authorityType = orga.authorityType;
                            localPermissions.permissions.push(permission);

                            // store permission
                            this.setPermissions(localPermissions,collection);

                        });
                    }, error => {
                        this.isLoading = false;
                        alert("Sorry, something went wrong. Try again or abort. (2c)");
                    });

                } else {

                    // if user wants to create a public collection ...
                    if (this.newCollectionScope==EduData.GETCOLLECTIONS_SCOPE.ALL) {
                        // ... add everybody group to local permissions
                        var permission:EduData.InheritedPermissions = new EduData.InheritedPermissions();
                        permission.permission = "Consumer";
                        permission.authority = new EduData.Authority();
                        permission.authority.authorityName = "GROUP_EVERYONE";
                        permission.authority.authorityType = "EVERYONE";
                        localPermissions.permissions.push(permission);
                    };

                    // store permission
                    this.setPermissions(localPermissions,collection);

                }
    }

    setPermissions(localPermissions:EduData.LocalPermissions, collection:EduData.Collection) : void {
            this.eduApiService.setPermissions(localPermissions, collection.ref.id).subscribe( permissions => {
                this.navigateToCollectionId(collection.ref.id);
            }, error => {
                this.isLoading = false;
                alert("Sorry, something went wrong. Try again or abort. (2)");
            });
    }

    navigateToCollectionId(id:string) : void {
        this.isLoading = false;
        this.router.navigate(['/collections',{id: id, t:(new Date()).getTime()}]);
    }

    ngOnInit() {
    
        // if running not in GWT context and is eduAPI is not ready --> auto login for dev with admin/admin
        if ( (!this.gwtInterface.isRunningInFrame()) && (!this.eduApiService.setUpIsWorking())) {
            this.eduApiService.oAuthInitWithUsernameAndPasswordFlow("admin","admin").subscribe(
                isWorking => {
                if (!isWorking) {
                    alert("SORRY, DEV AUTOLOGIN FAILED - API IS NOT READY!");
                } else {
                    this.ngOnInitFinal();
                }
            });
        } else {
            this.ngOnInitFinal();
        }

    }

    ngOnInitFinal() {

        // subscribe to paramter
        this.paramSubscription = this.route.params.subscribe(params => {

            // get id from route and validate input data
            var id = params['id'];
            if (typeof id == "undefined") id = "-root-";
            if (id=="") id = "-root-";

            // get mode from route and validate input data
            var mode = params['mode'];
            if (typeof mode == "undefined") mode = "new";
            if (mode=="") id = "new";

            if (mode=="edit") {
                this.editId = id;
                this.parentId = null;
            } else {
                this.editId = null;
                this.parentId = id;
            }

            this.newCollectionStep = 1;
            this.newCollectionName = "";
            this.newCollectionDescription = "";
            this.newCollectionScope = EduData.GETCOLLECTIONS_SCOPE.MY;
            this.newCollectionColor = "#975B5D";

            // on edit case load values of collection
            if (this.editId!=null) {
                this.isLoading = true;
                this.eduApiService.getCollectionMetadata(this.editId).subscribe( collection => {

                    // WIN

                    this.newCollectionName = collection.title;
                    this.newCollectionDescription = collection.description;
                    this.previewIcon = collection.icon;
                    if (collection.color!=null) this.newCollectionColor = collection.color;

                    // load permissions if needed
                    if (typeof collection.permission == "undefined") {

                        this.eduApiService.getPermissions(this.editId).subscribe( permissions => {
                            collection.permission = permissions;
                            this.newCollectionScope = collection.getPrivacyScope();
                            this.isLoading = false;
                            this.isReady = true;
                        }, error => {
                            // FAIL
                            this.isLoading = false;
                            this.isReady = true;
                            alert("error on edit collection/permission: "+JSON.stringify(error));
                            this.newCollectionCancel();
                        });

                    } else {
                        this.newCollectionScope = collection.getPrivacyScope();
                        this.isLoading = false;
                        this.isReady = true;
                    }

                }, error => {
                    // FAIL
                    this.isLoading = false;
                    this.isReady = true;
                    alert("error on edit collection/load: "+JSON.stringify(error));
                    this.newCollectionCancel();
                });
            } else {
                this.isLoading = false;
                this.isReady = true;
            }

        });
    }    

}