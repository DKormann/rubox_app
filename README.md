

# app Frontend

create and host website in 5 minutes only writing typescript

this will create a vite app with typescript

just run this command in terminal: (need npm installed)

```
source <(wget -qO- https://raw.githubusercontent.com/DKormann/app/refs/heads/main/viteapp.sh) YOUR_APP_NAME
```

inspect the script if you dont trust its v minimal


SETUP DONE! just start editing `src/main.ts`

the project will build into `/docs` which is perfect for gh-pages.

## hosting:
just go to github repo > settings > pages and select host from branch main and from folder /docs 


## development cycle:

1. edit typescript in src folder 
2. run `npm run dev` to see changes live
3. run `npm run build` to build for gh-pages
4. commit and push -> everything will be updated on your site
