namespace com.pg.xa.fiorianalyzer.db;
using { cuid, managed, sap } from '@sap/cds/common';

@cds.autoexpose
entity Systems : managed {
  key systemID : String(3) @(
        title       : '{i18n>System}',
        description : '{i18n>SystemDescription}'
    );
  description  : String  @(
        title       : '{i18n>Description}',
        description : '{i18n>DescriptionDescription}'
    );
  destination  : String  @(
        title       : '{i18n>Destination}',
        description : '{i18n>DestinationDescription}'
    );
}

entity JobStatus : sap.common.CodeList {
  key code : String enum {
    Started    = '0';
    InProcess  = '1';
    Finished   = '2';
    Failed     = '3';
  } default '0'; //> will be used for foreign keys as well
  criticality : Integer; //  0: grey, 1: red 2: yellow colour,  3: green colour, 
}

entity JobObjectType : sap.common.CodeList {
  key code : String enum {
    Application    = 'A';
    Package        = 'P';
  } default 'A'; //> will be used for foreign keys as well
  criticality : Integer; //  0: grey, 1: red 2: yellow colour,  3: green colour, 
}

entity Severity : sap.common.CodeList {
  key code : String enum {
    Warning       = 'W';
    Error         = 'E';
  } default 'A'; //> will be used for foreign keys as well
  criticality : Integer; //  0: grey, 1: red 2: yellow colour,  3: green colour, 
}

entity AnalyseJobs : cuid, managed {
    status: Association to JobStatus @(
        title       : '{i18n>JobStatus}',
        description : '{i18n>JobStatusDescription}'
    );
    systemID : String(3) @(
        title       : '{i18n>System}',
        description : '{i18n>SystemDescription}'
    );
    jobObjectsType: Association to JobObjectType @(
        title       : '{i18n>JobObjectsType}',
        description : '{i18n>JobObjectsTypeDescription}'
    );
}

entity AnalyseJobPages : cuid {
    package: String @(
        title       : '{i18n>Package}',
        description : '{i18n>PackageDescription}'
    );
    appName: String @(
        title       : '{i18n>Application}',
        description : '{i18n>ApplicationDescription}'
    );
    pageName: String @(
        title       : '{i18n>Application}',
        description : '{i18n>ApplicationDescription}'
    );
    to_Job : Association to AnalyseJobs;
}

entity AnalyseResults : cuid {
    message: String @(
        title       : '{i18n>Message}',
        description : '{i18n>MessageDescription}'
    );
    severity : Association to Severity @(
        title       : '{i18n>Severity}',
        description : '{i18n>SeverityDescription}'
    );
    column : Integer @(
        title       : '{i18n>Column}',
        description : '{i18n>ColumnDescription}'
    );
    row : Integer @(
        title       : '{i18n>Row}',
        description : '{i18n>RowDescription}'
    );
    to_Page : Association to AnalyseJobPages;
}