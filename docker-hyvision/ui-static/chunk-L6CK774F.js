import{i as t}from"./chunk-5KVR56NM.js";t();var e=(function(i){return i.TOTP="TOTP",i.SMS="SMS",i.EMAIL="EMAIL",i.BACKUP_CODE="BACKUP_CODE",i})(e||{}),n=new Map([[e.TOTP,{name:"security.2fa.provider.totp",description:"security.2fa.provider.totp-description",activatedHint:"security.2fa.provider.totp-hint"}],[e.SMS,{name:"security.2fa.provider.sms",description:"security.2fa.provider.sms-description",activatedHint:"security.2fa.provider.sms-hint"}],[e.EMAIL,{name:"security.2fa.provider.email",description:"security.2fa.provider.email-description",activatedHint:"security.2fa.provider.email-hint"}],[e.BACKUP_CODE,{name:"security.2fa.provider.backup_code",description:"security.2fa.provider.backup-code-description",activatedHint:"security.2fa.provider.backup-code-hint"}]]),r=new Map([[e.TOTP,{name:"security.2fa.provider.totp",description:"login.totp-auth-description",placeholder:"login.totp-auth-placeholder",icon:"mdi:cellphone-key"}],[e.SMS,{name:"security.2fa.provider.sms",description:"login.sms-auth-description",placeholder:"login.sms-auth-placeholder",icon:"mdi:message-reply-text-outline"}],[e.EMAIL,{name:"security.2fa.provider.email",description:"login.email-auth-description",placeholder:"login.email-auth-placeholder",icon:"mdi:email-outline"}],[e.BACKUP_CODE,{name:"security.2fa.provider.backup_code",description:"login.backup-code-auth-description",placeholder:"login.backup-code-auth-placeholder",icon:"mdi:lock-outline"}]]),c=new Map([[e.TOTP,{name:"login.enable-authenticator-app",description:"login.enable-authenticator-app-description"}],[e.SMS,{name:"login.enable-authenticator-sms",description:"login.enable-authenticator-sms-description"}],[e.EMAIL,{name:"login.enable-authenticator-email",description:"login.enable-authenticator-email-description"}],[e.BACKUP_CODE,{name:"security.2fa.provider.backup_code",description:"login.backup-code-auth-description"}]]),s=new Map([[e.TOTP,{name:"login.authenticator-app-success",description:"login.authenticator-app-success-description"}],[e.SMS,{name:"login.authenticator-sms-success",description:"login.authenticator-sms-success-description"}],[e.EMAIL,{name:"login.authenticator-email-success",description:"login.authenticator-email-success-description"}],[e.BACKUP_CODE,{name:"login.authenticator-backup-code-success",description:"login.authenticator-backup-code-success-description"}]]);var u=`<html lang="en">
<head>
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Backup code</title>

    <style>
        .code-block {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 16px;
        }
        .code-row {
            margin: 0 6px 8px;
            display: flex;
            min-width: 130px;
        }
        .code {
            font: 400 16px / 20px Roboto Mono, "Helvetica Neue", monospace;
            margin-left: 6px;
        }
        input[type="checkbox"] {
            -webkit-appearance: none;
            appearance: none;
            background-color: #fff;
            margin: 0;
            font: inherit;
            color: currentColor;
            width: 1em;
            height: 1em;
            border: 0.1em solid currentColor;
            border-radius: 0.15em;
            transform: translateY(0em);
        }
    </style>
</head>

<body style="margin: 0">
    <div style="margin: 8px; max-width: 286px">
        <div style="border: #d0d7de solid 1px; border-radius:4px">
            <h3 style="padding: 16px 24px; margin: 0; font: 500 20px / 24px Roboto, 'Helvetica Neue', sans-serif; text-align: center">
                Backup codes
            </h3>
            <div class="code-block">
                \${codesBlock}
            </div>
        </div>
    </div>
</body>
</html>
`;export{e as a,n as b,r as c,c as d,s as e,u as f};
