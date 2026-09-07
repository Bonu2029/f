# How to upload all your websites at once (and make the zip)

## Step 1 — Put each website in its folder

Copy each website's files into its matching folder here:

```
sites/flowers/
sites/dental/
sites/cleaning-service/
sites/chanel/
sites/cafe/
sites/beauty-salon/
sites/barbershop/
```

Put the actual files inside (`index.html`, `style.css`, `images/`, ...) — not
another folder wrapping them. So you want `sites/cafe/index.html`, not
`sites/cafe/cafe-website/index.html`.

## Step 2 — Make the zip files

Run this once, from this folder:

```bash
bash zip-sites.sh
```

You get:

- `dist/flowers.zip`, `dist/dental.zip`, ... — one zip per website
- `dist/all-websites.zip` — **every website in a single zip**

### No terminal? Zip it by hand

- **Windows:** right-click the `sites` folder → **Send to** → **Compressed (zipped) folder**
- **Mac:** right-click the `sites` folder → **Compress "sites"**

That single zip contains all seven websites.

## Step 3 — Upload all of them in one go

### Easiest: drag the folder into GitHub

1. Open your repo on github.com
2. Click **Add file** → **Upload files**
3. **Drag the whole `sites` folder** from your file manager onto the page

   GitHub accepts an entire folder dropped this way and keeps the subfolders.
   (The *"choose your files"* button only picks individual files — dragging the
   folder is what uploads everything at once.)
4. Type a message like `Add my 7 websites` and click **Commit changes**

Limits: 100 files per drag and 25 MB per file. If you have more than that, do it
in two or three drags, or use the command line below.

> Note: don't upload the `.zip` itself if you want the files browsable on
> GitHub — GitHub stores a zip as one opaque file. Upload the folder for
> browsable code; upload the zip only when you just need to hand someone a copy.

### Command line (no file-count limit)

```bash
git add sites
git commit -m "Add my 7 websites"
git push -u origin claude/website-files-zip-upload-dq6rzu
```
