import { Writable } from "./store"

export type htmlKey = 'innerText'|'onclick'|'children'|'class'|'id'|'contentEditable'|'eventListeners'|'color'|'background' | 'style'

export const htmlElement = (tag:string, text:string, cls:string = "", args?:Partial<Record<htmlKey, any>>):HTMLElement =>{

  const _element = document.createElement(tag)
  _element.innerText = text
  if (cls) _element.classList.add(...cls.split('.').filter(x=>x))
  if (args) Object.entries(args).forEach(([key, value])=>{
    if (key === 'parent'){
      (value as HTMLElement).appendChild(_element)
    }
    if (key==='children'){
      (value as HTMLElement[]).forEach(c=>_element.appendChild(c))
    }else if (key==='eventListeners'){
      Object.entries(value as Record<string, (e:Event)=>void>).forEach(([event, listener])=>{
        _element.addEventListener(event, listener)
      })
    }else if (key === 'color' || key === 'background'){
      _element.style[key] = value
    }else if (key === 'style'){
      Object.entries(value as Record<string, string>).forEach(([key, value])=>{
        _element.style.setProperty(key, value)
      })
    }else{
      _element[(key as 'innerText' | 'onclick' | 'id' | 'contentEditable')] = value
    }
  })
  return _element
}


type HTMLArg = string | number | HTMLElement | Partial<Record<htmlKey, any>> | Writable<any> | Promise<HTMLArg> | HTMLArg[]


export const html = (tag:string, ...cs:HTMLArg[]):HTMLElement=>{
  let children: HTMLElement[] = []
  let args: Partial<Record<htmlKey, any>> = {}

  const add_arg = (arg:HTMLArg)=>{
    if (typeof arg === 'string') children.push(htmlElement("span", arg))
    else if (typeof arg === 'number') children.push(htmlElement("span", arg.toString()))
    else if (arg instanceof Writable){
      const el = span()
      arg.subscribe((value)=>{
        el.innerHTML = ""
        el.appendChild(span(value))
      })
      children.push(el)
    }
    else if (arg instanceof Promise){
      const el = span()
      arg.then((value)=>{
        el.innerHTML = ""
        el.appendChild(span(value))
      })
      children.push(el)
    }
    else if (arg instanceof HTMLElement) children.push(arg)
    else if (arg instanceof Array) arg.forEach(add_arg)
    else args = {...args, ...arg}
  }
  for (let arg of cs){
    add_arg(arg)
  }
  return htmlElement(tag, "", "", {...args, children})
}


export type HTMLGenerator<T extends HTMLElement = HTMLElement> = (...cs:HTMLArg[]) => T

const newHtmlGenerator = <T extends HTMLElement>(tag:string)=>(...cs:HTMLArg[]):T=>html(tag, ...cs) as T



export const p:HTMLGenerator<HTMLParagraphElement> = newHtmlGenerator("p")
export const h1:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h1")
export const h2:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h2")
export const h3:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h3")
export const h4:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h4")

export const div:HTMLGenerator<HTMLDivElement> = newHtmlGenerator("div")
export const button:HTMLGenerator<HTMLButtonElement> = newHtmlGenerator("button")
export const span:HTMLGenerator<HTMLSpanElement> = newHtmlGenerator("span")
export const textarea:HTMLGenerator<HTMLTextAreaElement> = newHtmlGenerator("textarea")

export const table:HTMLGenerator<HTMLTableElement> = newHtmlGenerator("table")
export const tr:HTMLGenerator<HTMLTableRowElement> = newHtmlGenerator("tr")
export const td:HTMLGenerator<HTMLTableCellElement> = newHtmlGenerator("td")
export const th:HTMLGenerator<HTMLTableCellElement> = newHtmlGenerator("th")


export const input:HTMLGenerator<HTMLInputElement> = (...cs)=>{

  const writable = cs.find(c=>c instanceof Writable) as Writable<string>

  const content = cs.filter(c=>typeof c == 'string').join(' ')

  const el = html("input", ...cs) as HTMLInputElement

  if (writable){
    el.value = writable.get()
    writable.subscribeLater((value)=>{
      if (el.value !== value.toString()){
        el.value = value.toString()
      }
    })
    el.oninput = (e)=>{
      writable.set((e.target as HTMLInputElement).value)
    }
  }else{
    el.value = content
  }
  return el
}



export const popup = (dialogfield: HTMLElement)=>{

  // const popupbackground = htmlElement("div", "", "popup-background");
  const popupbackground = div(
    {style:{
      "position": "fixed",
      "top": "0",
      "left": "0",
      "width": "100%",
      "height": "100%",
      "background": "rgba(166, 166, 166, 0.5)",
      "display": "flex",
      "justify-content": "center",
      "align-items": "center",
    }}
  )

  popupbackground.appendChild(dialogfield);
  document.body.appendChild(popupbackground);
  popupbackground.onclick = () => {
    popupbackground.remove();
  }

  dialogfield.style.background = "var(--bg)"
  dialogfield.style.color = "var(--color)"
  dialogfield.style.padding = "1em"
  dialogfield.style.paddingBottom = "2em"
  dialogfield.style.borderRadius = "1em"

  // popupbackground.appendChild(p("close", {
  //   onclick: () => {
  //     popupbackground.remove();
  //   }
  // }))

  dialogfield.onclick = (e) => {
    e.stopPropagation();
  }

  return popupbackground

}
