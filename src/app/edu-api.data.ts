/**********************************************************
 * TypeScript data classes to use with the edu-sharing API
 **********************************************************
 *
 * Use import * as EduData from ... if you do not want to import every single class
 *
 * TYPESCRIPT CLASS --> JSON
 *
 * Use JSON.stringify()
 *
 * JSON --> TYPESCRIPT CLASS
 *
 * The data classes contain static methods called 'fromJSON' and alike. Those can be
 * be used to convert a json object back to the TypeScript prototype class.
 *
 * For more info on this topic see:
 * http://choly.ca/post/typescript-json/
 */


/*******************************
    NODE
********************************/    

export class Node {

    ref:Reference;
    parent:Reference;

    type:string;

    title:string;
    name:string;
    description:string;

    createdBy:Person;
    createdAt:string;

    modifiedBy:Person;
    modifiedAt:string;

    contentVersion:string;
    contentUrl:string;

    access:Array<Permission>;

    properties:Array<Property>;

    preview:Preview;

    size:number;
    mimetype:string;

    /*
     * Methods on Node
     */

    isContentItem():boolean {
        if ((this.type!=null) && (this.type=="{http://www.campuscontent.de/model/1.0}io")) {
            console.warn("workaround type bug DESREPO-380 - please fix");
            this.type = "{http://www.campuscontent.de/model/1.0}io}";
        }
        return ((this.type != null) && (this.type == "{http://www.campuscontent.de/model/1.0}io}"));
    }

    isFolder():boolean {
        return ((this.type != null) && (this.type == "{http://www.campuscontent.de/model/1.0}map"));
    }

    getName():string {
        if (this.name!=null) return this.name;
        return this.title;
    }

    getCreatorName():string {
        let result:string = "";
        if (this.gotProperty('NodeCreator_FirstName')) result = this.getProperty('NodeCreator_FirstName')[0];
        if (this.gotProperty('NodeCreator_LastName')) result += " "+this.getProperty('NodeCreator_LastName')[0];
        return result;
    }

    getCreateTime():string {
        if (this.gotProperty('{http://www.alfresco.org/model/content/1.0}created')) return this.getProperty('{http://www.alfresco.org/model/content/1.0}created')[0];
        return this.createdAt;
    }

    getPreviewUrl():string {
        return "/edu-sharing/preview?nodeId="+this.ref.id+"&amp;storeProtocol=workspace&amp;storeId=SpacesStore&amp;dontcache=1466806895248";
    }

    gotProperty(name:string):boolean {
        if (this.properties==null) return false;
        for (var prop of this.properties) {
            if (prop.name===name) return true;
        }
        return false;
    }

    getProperty(name:string):string[] {
        if (this.properties==null) return null;
        for (var prop of this.properties) {
            if (prop.name===name) return prop.values;
        }
        return null;
    }

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Node {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Node.prototype), json, {

            ref:        Reference.fromJSON(json.ref),
            parent:     Reference.fromJSON(json.parent),
            createdBy:  Person.fromJSON(json.createdBy),
            modifiedBy: Person.fromJSON(json.modifiedBy),
            preview:    Preview.fromJSON(json.preview),
            properties: Tools.fromJSONArray<Property>(json.properties, Property.fromJSON),
            access:     Tools.fromJSONArray<Permission>(json.access, Permission.fromJSON)

        });
    }
}

export class Reference {

    repo:string;
    id:string;

    constructor(repo:string="-home-",id:string="-root-") {
        this.id = id;
        this.repo = repo;
    };

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Reference {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Reference.prototype), json);
    }
}

export class Property {

    name:string;
    values:string[];

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Property {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Property.prototype), json);
    }
    
}

export class Permission {

    permission:string;
    hasRight:boolean;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Permission {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Permission.prototype), json);
    }

}

export class Preview {

    url:string;
    width:number;
    height:number;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Preview {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Preview.prototype), json);
    }
}

export class Person {

    firstName:string;
    lastName:string;
    mailbox:string;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Person {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Person.prototype), json);
    }
}

/*******************************
    COLLECTION
********************************/    

export class Collection {
    
      ref:Reference;                    // node behind collecition with more metadata
      level0:boolean;                   // if a root level collection
      title:string;                     // name of the collection
      description:string;               // description (optional)
      type:string;                      // type='default' at the moment
      viewtype:string;                  // ? prefrerred type of visualisation
      x:number;                         // between 0.0 and 1.0 - row order
      y:number;                         // + between 0.0 and 1.0 - map order
      z:number;                         // + between 0.0 and 1.0 - 3D order
      color:string;                     // e.g. #FF0000 for red
      icon:string;                      // ? array of string
      childCollectionsCount:number;     // count of sub collections
      childReferencesCount:number;      // count of material in collection
      owner:Owner;                     // information about the user owning the collection
      permission:Permissions;           // the permissions on this collections
      access:Array<AccessPermission>;   // list of access permissions on this 

    getPrivacyScope() : number {

        // when permission information is not available
        if (this.permission==null) {
            return GETCOLLECTIONS_SCOPE.UNKOWN;
        }

        // check if public
        if (this.permission.isSimplePermissionPublic()) {
            return GETCOLLECTIONS_SCOPE.ALL;
        }

        // check if public to an organization
        if (this.permission.isSimplePermissionOrganization()) {
            return GETCOLLECTIONS_SCOPE.GROUPS;
        }

        // if not public & not organization - just private level access left
        return GETCOLLECTIONS_SCOPE.MY;

    }

    isUserAllowedToEdit(person:Person) : boolean {

        // if permissions missing default to false
        if (this.permission==null) return false;

        // check access permissions on collection
        console.log(JSON.stringify(this.access));
        //if (this.permission.isAllowedToEdit()) return true;
        if (this.hasAccessPermission('Write')) return true;

        // check if user is owner of collection
        if (this.owner.userName!=null) return true;

        // if nothing else matched - default to no right to edit
        return false;
    }

    hasAccessPermission(permission:string) : boolean {
        if (typeof this.access == "undefined") return true;
        if (typeof this.access == null) return true;
        var result = false;
        this.access.forEach( element => {
            if (element.permission == permission) {
                result=element.hasRight;
            }
        });
        return result;
    }

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Collection {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Collection.prototype), json, {
            ref: Reference.fromJSON(json.ref),
            owner: Person.fromJSON((typeof json.owner == "undefined") ? {}: json.owner.profile),
            access: Tools.fromJSONArray<AccessPermission>(json.access,AccessPermission.fromJSON) 
        });
    }

}

export class CollectionReference {

    ref:Reference;
    reference:Node;
    originalId:string;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Node {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Node.prototype), json, {
            ref:        Reference.fromJSON(json.ref),
            originalId: (json.originalId != null) ? json.originalId : null,
            reference:  (json.reference != null) ? Node.fromJSON(json.reference) : null
        });
    }
}

export class CollectionContent {
      
    collection:Collection; // meta data of collection
    collections:Array<Collection>; // array of sub collections
    references:Array<CollectionReference>; // array of content nodes references

    constructor() {
        this.collection = new Collection();
        this.collection.ref = new Reference();
        this.collections = new Array<Collection>();
        this.references = new Array<CollectionReference>();
    }

    getCollectionID() :string {
        if (this.collection==null) return null;
        if (this.collection.ref==null) return null;
        return this.collection.ref.id;
    }

    setCollectionID(id:string):void {
        if (this.collection==null) this.collection = new Collection();
        if (this.collection.ref==null) this.collection.ref = new Reference();
        this.collection.ref.id = id;;
    }
      
    // to get prototype class back from plain JSON
    static fromJSON(json:any): CollectionContent {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(CollectionContent.prototype), json, {
            collection: (typeof json.collection != 'undefined') ? Collection.fromJSON(json.collection) : null,
            references: Tools.fromJSONArray<CollectionReference>(json.references,CollectionReference.fromJSON),
            collections: Tools.fromJSONArray<Collection>(json.collections,Collection.fromJSON) 
        });
    }
    
}

export class Owner {

    authorityName:any;
    authorityType:any;
    userName:string = null;     // this one is 
    profile:Person;             // TODO has 'email' field instead of 'mailbox' ... make ticket later
    homeFolder:any;
    sharedFolders:any;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Owner {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Owner.prototype), json, {
            profile:  Person.fromJSON(json.profile)
        });
    }

}


/*******************************
    PERMISSION DATA STRUCTURE
********************************/    

export class Permissions {

    localPermissions:LocalPermissions;
    inheritedPermissions:Array<InheritedPermissions>;

    // checks permission if its open to see for everybody
    isSimplePermissionPublic():boolean {

        var result:boolean = false;

        // check inherited permissions (if active)
        if ((this.inheritedPermissions!=null) && (this.localPermissions.inherited)) {
            this.inheritedPermissions.forEach( permission => {
                if (permission.authority.authorityType == "EVERYONE") result=true;
            });
        }

        // check local permissions
        if ((this.localPermissions!=null) && (this.localPermissions.permissions!=null)) {
            this.localPermissions.permissions.forEach( permission => {
                if (permission.authority.authorityType == "EVERYONE") result=true;
            });
        }
        
        return result;
    }

    // checks permission if its open to see by organizations
    isSimplePermissionOrganization():boolean {

        var result:boolean = false;

        // check inherited permissions (if active)
        if ((this.inheritedPermissions!=null) && (this.localPermissions.inherited)) {
            this.inheritedPermissions.forEach( permission => {
                if (permission.authority.authorityName.startsWith("GROUP_")) result=true;
            });
        }

        // check local permissions
       if ((this.localPermissions!=null) && (this.localPermissions.permissions!=null)) {
       this.localPermissions.permissions.forEach( permission => {
                if (permission.authority.authorityName.startsWith("GROUP_")) result=true;
            } );
       }
    
        return result; 
    }

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Permissions {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Permissions.prototype), json, {
            localPermissions: LocalPermissions.fromJSON(json.localPermissions),
            inheritedPermissions: Tools.fromJSONArray<InheritedPermissions>(json.inheritedPermissions,InheritedPermissions.fromJSON)
        });
    }

}

export class LocalPermissions {

    inherited:boolean;
    permissions:Array<InheritedPermissions>; // TODO remove any as placeholder

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Permissions {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(LocalPermissions.prototype), json, {});
    }
}

export class InheritedPermissions {

    authority:Authority;
    permission:string;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Permissions {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(InheritedPermissions.prototype), json, {
            authority: Authority.fromJSON(json.authority)
        });
    }
}

export class Authority {

    authorityName:string;
    authorityType:string;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Permissions {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Authority.prototype), json, {});
    }
}

export class AccessPermission {

    permission:string;  // 'Write' ord 'Delete'
    hasRight:boolean;   // signaling if the user has the right above

    // to get prototype class back from plain JSON
    static fromJSON(json:any): AccessPermission {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(AccessPermission.prototype), json, {});
    }

}

/*******************************
    ORGANIZATION
********************************/    

export class Organization {

    authorityName:string;
    authorityType:string;
    groupName:string;
    profile:Profile;
    sharedFolder:Reference;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Permissions {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Organization.prototype), json, {
            profile: Profile.fromJSON(json.profile),
            sharedFolder: Reference.fromJSON(json.sharedFolder),
        });
    }
}

export class Profile {

    displayName:string;

    // to get prototype class back from plain JSON
    static fromJSON(json:any): Permissions {
        if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Profile.prototype), json, {
        });
    }
}

export class PersonalProfile {

   authorityName:string;
   authorityType:string;
   userName:string;
   profile:Person;
   homeFolder:Reference;
   sharedFolders:Array<Reference>;

   // to get prototype class back from plain JSON
   static fromJSON(json:any): Permissions {
    if (typeof json === "string") json = JSON.parse(json);
        return Object.assign(Object.create(Profile.prototype), json, {
            profile: Person.fromJSON(json.profile),
            homeFolder: Reference.fromJSON(json.homeFolder),
            sharedFolders: Tools.fromJSONArray<Reference>(json.sharedFolders,Reference.fromJSON)
    });
   }

}

/*******************************
    TOOLS
********************************/

// this is not a data class - just a static toolbox to ease the use of the data classes
export class Tools {
    
    /**
     * Converts an JSON array of same edu data classes at once.
     * example for an array of Nodes use: fromJSONArray<Node>(jsonArray, Node.fromJSON)
     */
    static fromJSONArray<T>(json:any, fromJsonFunction:any): Array<T> {
        try {
            if (typeof json === "string") json = JSON.parse(json);
            var result:Array<T> = new Array<T>();
            for (var i=0; i<json.length; i++) result.push(fromJsonFunction(json[i]));
            return result;
        } catch (e) {
            console.warn("EXCEPTION on JSON conversion (json next output): "+JSON.stringify(e));
            console.warn("JSON transformation function:");
            console.dir(fromJsonFunction);
            console.warn("JSON data:");
            console.dir(json);
            return new Array<T>();
        }
    }
       
}

export enum GETCOLLECTIONS_SCOPE {
    UNKOWN,
    MY,
    GROUPS,
    ALL
}