#!/bin/bash
set -e

cd /tmp/ui-extract
cp -f /tmp/logo_title_white.svg public/assets/logo_title_white.svg
cp -f /tmp/logo_white.svg public/assets/logo_white.svg
cp -f /tmp/thingsboard.ico public/thingsboard.ico

# Update Title and spinner in index.html
perl -pi -e 's|<title>ThingsBoard</title>|<title>HyVision</title>|g' public/index.html
perl -pi -e 's|rgb\(43,160,199\)|rgb(67,106,60)|g' public/index.html

# Update CSS colors and hide github badge
echo -e "\n\ntb-github-badge { display: none !important; }\n" >> public/styles-WUQVJSVC.css
perl -pi -e 's|#305680|#436A3C|g' public/styles-WUQVJSVC.css
perl -pi -e 's|#527dad|#2F4D2A|g' public/styles-WUQVJSVC.css
perl -pi -e 's|#a7c1de|#8CAE84|g' public/styles-WUQVJSVC.css
perl -pi -e 's|#303f9f|#253e21|g' public/styles-WUQVJSVC.css
perl -pi -e 's|#283593|#1b2f18|g' public/styles-WUQVJSVC.css
perl -pi -e 's|#1a237e|#101e0e|g' public/styles-WUQVJSVC.css
perl -pi -e 's|Roboto, "Helvetica Neue", sans-serif|"Adria Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif|g' public/styles-WUQVJSVC.css

echo "Rebuilding ui-ngx-4.3.1.6.jar..."
/usr/bin/jar -cf /tmp/jar/BOOT-INF/lib/ui-ngx-4.3.1.6.jar -C /tmp/ui-extract .

echo "Updating thingsboard.jar..."
cd /tmp/jar
/usr/bin/jar -uf /usr/share/thingsboard/bin/thingsboard.jar BOOT-INF/lib/ui-ngx-4.3.1.6.jar

echo "Patch completed successfully!"
