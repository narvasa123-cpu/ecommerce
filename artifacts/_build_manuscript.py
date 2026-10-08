import os, sys
from pathlib import Path

sys.path.append(os.path.join(os.environ['TEMP'], 'codex-docdeps'))
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artifacts'
OUT = ART / 'ORVEN_Ecommerce_Analytics_Research_Paper.docx'
NAVY = '25342D'; GREEN = '667565'; GOLD = 'A98A55'; PALE = 'EEF0EB'; INK = '242522'; GRAY = '666A66'

def font(size=24, bold=False):
    try:
        return ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf', size)
    except Exception:
        return ImageFont.load_default()

def rounded(draw, box, fill, outline=None, radius=18, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def arrow(draw, start, end, fill='#667565', width=5):
    draw.line([start, end], fill=fill, width=width)
    x2,y2=end; x1,y1=start
    import math
    a=math.atan2(y2-y1,x2-x1)
    pts=[]
    for da in (2.6,-2.6):
        pts.append((x2+18*math.cos(a+da),y2+18*math.sin(a+da)))
    draw.polygon([end,*pts],fill=fill)

def centered(draw, box, text, f, fill='#242522'):
    lines=text.split('\n'); heights=[]
    for line in lines:
        b=draw.textbbox((0,0),line,font=f); heights.append(b[3]-b[1])
    total=sum(heights)+8*(len(lines)-1); y=(box[1]+box[3]-total)/2
    for line,h in zip(lines,heights):
        b=draw.textbbox((0,0),line,font=f); x=(box[0]+box[2]-(b[2]-b[0]))/2
        draw.text((x,y),line,font=f,fill=fill); y+=h+8

def diagram_use_case(path):
    im=Image.new('RGB',(1600,980),'white'); d=ImageDraw.Draw(im)
    d.text((70,45),'ORVEN System Use Cases',font=font(42,True),fill='#25342D')
    actors=[('Customer',(120,260)),('Administrator',(120,710)),('Payment Service',(1370,520))]
    for label,(x,y) in actors:
        d.ellipse((x+45,y,x+85,y+40),outline='#25342D',width=4); d.line((x+65,y+40,x+65,y+130),fill='#25342D',width=4)
        d.line((x+25,y+75,x+105,y+75),fill='#25342D',width=4); d.line((x+65,y+130,x+25,y+180),fill='#25342D',width=4); d.line((x+65,y+130,x+105,y+180),fill='#25342D',width=4)
        centered(d,(x-20,y+185,x+150,y+225),label,font(22,True))
    d.rounded_rectangle((330,130,1260,900),radius=24,outline='#A98A55',width=5)
    d.text((365,150),'System boundary',font=font(22,True),fill='#A98A55')
    cases=[('Browse and search\nproducts',(420,250)),('Manage cart and\napply promotion',(750,250)),('Register / sign in\nand manage address',(420,430)),('Checkout and track\norders',(750,430)),('Manage products,\ncollections and stock',(420,650)),('Manage orders, reports,\ncustomers and promotions',(750,650)),('Confirm test\npayment',(1040,500))]
    for label,(x,y) in cases:
        box=(x,y,x+250,y+110); d.ellipse(box,fill='#EEF0EB',outline='#667565',width=3); centered(d,box,label,font(20))
    for y in (305,485): arrow(d,(260,y),(420,y),width=3)
    for y in (705,755): arrow(d,(260,y),(420 if y==705 else 750,y),width=3)
    arrow(d,(1000,485),(1040,540),width=3); arrow(d,(1370,610),(1290,570),width=3)
    im.save(path)

def diagram_flow(path, current=False):
    im=Image.new('RGB',(1600,1100),'white'); d=ImageDraw.Draw(im)
    title='Current Manual Process Flow' if current else 'Proposed E-Commerce Transaction Flow'
    d.text((90,45),title,font=font(42,True),fill='#25342D')
    if current:
        labels=['Customer sends an inquiry','Staff checks product records','Staff confirms price and availability','Customer provides order details','Staff computes total manually','Payment/order details are recorded','Staff updates stock and prepares order']
    else:
        labels=['Browse or search catalogue','Choose variant and add to bag','Server recalculates price, tax and delivery','Enter delivery details and review order','Transactional stock reservation and order creation','Sandbox or Stripe test confirmation','Order tracking and admin fulfillment']
    boxes=[]; y=140
    for i,label in enumerate(labels):
        x=290 if i%2==0 else 760; box=(x,y,x+560,y+100); boxes.append(box)
        rounded(d,box,'#EEF0EB' if i not in (4,5) else '#F6EFE2','#667565',18,3); centered(d,box,label,font(23, i in (4,5)))
        y+=135
    for i in range(len(boxes)-1):
        a,b=boxes[i],boxes[i+1]; arrow(d,((a[0]+a[2])//2,a[3]),((b[0]+b[2])//2,b[1]),width=4)
    im.save(path)

def diagram_erd(path):
    im=Image.new('RGB',(1800,1150),'white'); d=ImageDraw.Draw(im)
    d.text((70,35),'Core Relational Database Design',font=font(40,True),fill='#25342D')
    entities={
      'User':['id (PK)','email (unique)','role'],'Session':['id (PK)','userId (FK)','expiresAt'],
      'Address':['id (PK)','userId (FK)','shipping details'],'PasswordReset':['id (PK)','userId (FK)','expiresAt'],
      'Collection':['id (PK)','slug (unique)','name'],'Product':['id (PK)','collectionId (FK)','price (cents)','active'],
      'Image':['id (PK)','productId (FK)','url, alt, position'],'Variant':['id (PK)','productId (FK)','SKU (unique)','color, size'],
      'Inventory':['id (PK)','variantId (unique/FK)','quantity'],'StockMovement':['id (PK)','variantId (FK)','delta, reason'],
      'Cart':['id (PK)','promotionCode','updatedAt'],'CartItem':['id (PK)','cartId (FK)','variantId (FK)','quantity'],
      'Order':['id (PK)','userId (optional FK)','number, status','total (cents)'],'OrderItem':['id (PK)','orderId (FK)','variantId (FK)','quantity, price'],
      'Payment':['id (PK)','orderId (unique/FK)','provider, status'],'Shipment':['id (PK)','orderId (unique/FK)','carrier, tracking']}
    positions={}; cols=[50,500,950,1400]; rows=[115,365,615,865]
    for idx,(name,fields) in enumerate(entities.items()):
        x=cols[idx%4]; y=rows[idx//4]; box=(x,y,x+390,y+195); positions[name]=box
        d.rectangle(box,fill='#FAFAF7',outline='#667565',width=3); d.rectangle((x,y,x+390,y+43),fill='#25342D')
        d.text((x+14,y+8),name,font=font(23,True),fill='white')
        for j,fld in enumerate(fields): d.text((x+14,y+53+j*29),fld,font=font(17),fill='#242522')
    rel=[('User','Session'),('User','Address'),('User','PasswordReset'),('User','Order'),
         ('Collection','Product'),('Product','Image'),('Product','Variant'),('Variant','Inventory'),
         ('Variant','StockMovement'),('Cart','CartItem'),('Variant','CartItem'),('Order','OrderItem'),
         ('Variant','OrderItem'),('Order','Payment'),('Order','Shipment')]
    for a,b in rel:
        A=positions[a]; B=positions[b]; p=((A[0]+A[2])//2,(A[1]+A[3])//2); q=((B[0]+B[2])//2,(B[1]+B[3])//2)
        d.line((p,q),fill='#A98A55',width=3)
    im.save(path)

for name,fn in [('use-case.png',diagram_use_case),('current-flow.png',lambda p:diagram_flow(p,True)),('system-flow.png',diagram_flow),('database-design.png',diagram_erd)]:
    fn(ART/name)

doc=Document(); sec=doc.sections[0]
sec.page_width=Inches(8.5); sec.page_height=Inches(11); sec.top_margin=sec.bottom_margin=Inches(0.85); sec.left_margin=sec.right_margin=Inches(0.9); sec.header_distance=sec.footer_distance=Inches(0.45)
update_fields=OxmlElement('w:updateFields'); update_fields.set(qn('w:val'),'true')
doc.settings._element.append(update_fields)

styles=doc.styles
normal=styles['Normal']; normal.font.name='Calibri'; normal.font.size=Pt(11); normal.font.color.rgb=RGBColor.from_string(INK); normal.paragraph_format.space_after=Pt(8); normal.paragraph_format.line_spacing=1.22; normal.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
for s,size,color,before,after in [('Title',30,NAVY,0,12),('Heading 1',18,NAVY,14,8),('Heading 2',14,GREEN,12,6),('Heading 3',12,GOLD,10,4)]:
    st=styles[s]; st.font.name='Calibri'; st.font.size=Pt(size); st.font.bold=True; st.font.color.rgb=RGBColor.from_string(color); st.paragraph_format.space_before=Pt(before); st.paragraph_format.space_after=Pt(after)

def shade(cell,fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),fill); tcPr.append(shd)
def cell_margin(cell,top=90,start=120,bottom=90,end=120):
    tc=cell._tc; tcPr=tc.get_or_add_tcPr(); m=tcPr.first_child_found_in('w:tcMar')
    if m is None: m=OxmlElement('w:tcMar'); tcPr.append(m)
    for tag,val in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node=OxmlElement('w:'+tag); node.set(qn('w:w'),str(val)); node.set(qn('w:type'),'dxa'); m.append(node)
def add_table(headers,rows,widths=None):
    t=doc.add_table(rows=1,cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    for i,h in enumerate(headers):
        c=t.rows[0].cells[i]; c.text=h; shade(c,NAVY); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; cell_margin(c)
        for r in c.paragraphs[0].runs: r.font.bold=True; r.font.color.rgb=RGBColor(255,255,255); r.font.size=Pt(9)
    for row in rows:
        cells=t.add_row().cells
        for i,val in enumerate(row):
            cells[i].text=str(val); cell_margin(cells[i]); cells[i].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            for p in cells[i].paragraphs: p.paragraph_format.space_after=Pt(1); p.paragraph_format.line_spacing=1.0
            for r in cells[i].paragraphs[0].runs: r.font.size=Pt(9)
    if widths:
        for row in t.rows:
            for c,w in zip(row.cells,widths): c.width=Inches(w)
    doc.add_paragraph().paragraph_format.space_after=Pt(2)
    return t
def heading(text,level=1): doc.add_heading(text,level=level)
def para(text,bold_lead=None):
    p=doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead): p.add_run(bold_lead).bold=True; p.add_run(text[len(bold_lead):])
    else: p.add_run(text)
    return p
def bullets(items):
    for item in items:
        p=doc.add_paragraph(style='List Bullet'); p.paragraph_format.left_indent=Inches(.3); p.paragraph_format.first_line_indent=Inches(-.18); p.paragraph_format.space_after=Pt(4); p.add_run(item)
def figure(path,caption,width=6.45):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run().add_picture(str(path),width=Inches(width))
    c=doc.add_paragraph(caption); c.alignment=WD_ALIGN_PARAGRAPH.CENTER; c.paragraph_format.space_after=Pt(10)
    for r in c.runs: r.italic=True; r.font.size=Pt(9); r.font.color.rgb=RGBColor.from_string(GRAY)
def chapter(title):
    doc.add_page_break(); p=doc.add_paragraph(); p.style='Heading 1'; p.add_run(title)
def field(paragraph, instruction):
    run=paragraph.add_run()
    begin=OxmlElement('w:fldChar'); begin.set(qn('w:fldCharType'),'begin')
    code=OxmlElement('w:instrText'); code.set(qn('xml:space'),'preserve'); code.text=instruction
    separate=OxmlElement('w:fldChar'); separate.set(qn('w:fldCharType'),'separate')
    result=OxmlElement('w:t'); result.text='Update field in Word to display'
    end=OxmlElement('w:fldChar'); end.set(qn('w:fldCharType'),'end')
    run._r.extend([begin,code,separate,result,end])

# Cover
p=doc.add_paragraph(); p.paragraph_format.space_before=Pt(105); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
r=p.add_run('ORVEN'); r.bold=True; r.font.size=Pt(17); r.font.color.rgb=RGBColor.from_string(GOLD)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run('Development of an E-Commerce Management System\nwith Integrated Sales, Customer, and Product\nPerformance Analytics'); r.bold=True; r.font.size=Pt(25); r.font.color.rgb=RGBColor.from_string(NAVY)
p=doc.add_paragraph('A System Development Research Paper'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.runs[0].italic=True; p.runs[0].font.size=Pt(14)
doc.add_paragraph('\n')
for line in ['Prepared by: [Researcher Name/s]','Program/Section: [Program and Section]','School: [Institution Name]','Adviser: [Adviser Name]','Academic Year: [Academic Year]']:
    p=doc.add_paragraph(line); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph('\n')
p=doc.add_paragraph('Prototype status: academic demonstration; payments and fulfillment are test-mode only.'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.runs[0].font.size=Pt(9); p.runs[0].font.color.rgb=RGBColor.from_string(GRAY)

doc.add_page_break(); heading('Abstract',1)
para('This study evaluates ORVEN against the e-commerce and analytics requirements supplied for the project. ORVEN is a web-based prototype for a fictional leather-goods concept store. Its implemented functions include online shopping, carts, sandbox checkout, product administration, customer accounts, and an administrator dashboard. Code inspection confirms that the dashboard reports paid order value, total order count, average paid order value, new registered customers, daily paid-order value, fulfillment workload, and low-stock variants. It does not currently report product performance, cart-abandonment rate, customer location, or top categories. The descriptive evaluation uses requirements traceability and documented software verification rather than claiming a field study or measured business impact. Project records dated 6 October 2026 report 28 unit/integration tests and 18 desktop/mobile browser scenarios passing after the PostgreSQL migration. The results describe only the tested prototype; the catalogue is fictional, payment is test-mode, no participant study or real-retailer baseline was conducted, and complete hosted checkout verification remains pending.')
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(12)
r=p.add_run('Keywords: '); r.bold=True
p.add_run('e-commerce analytics, requirements traceability, system evaluation, online retail, ORVEN')

doc.add_page_break(); heading('Table of Contents',1)
p=doc.add_paragraph(); field(p,'TOC \\o "1-2" \\h \\z \\u')

chapter('Chapter 1 — Introduction')
heading('Project Title',2); para('Development of an E-Commerce Management System with Integrated Sales, Customer, and Product Performance Analytics')
heading('Background of the Study',2)
para('An e-commerce platform produces operational data when customers browse products, add items to a cart, place orders, and create accounts. Organizing these records can help administrators monitor sales, customer acquisition, product results, and changes over time. However, storing transaction data is not the same as presenting the requested analytics: measures require explicit definitions, a suitable observation window, and a report that administrators can inspect.')
para('This study focuses on the E-Commerce Analytics System requirements provided for the ORVEN project. They specify five shopping and account functions—online shopping, cart, checkout, product management, and customer account—and seven dashboard indicators: sales performance, customer growth, product performance, cart-abandonment rate, revenue trends, customer location, and top categories. The existing ORVEN application is a relevant working prototype: it implements the storefront and core administration workflows and a limited reporting dashboard. Comparing the supplied requirements with the actual code and recorded tests makes it possible to identify both verified functionality and analytics gaps without claiming that unimplemented reports already exist.')
para('ORVEN is a fictional concept store for leather bags and small goods, not a live retailer. The application uses Next.js, TypeScript, Prisma, and Supabase PostgreSQL. The payment integration is limited to sandbox or Stripe test mode. The supplied requirements are treated as the project specification for this evaluation; they are not presented as the result of interviews, surveys, or field observation.')
heading('Problem Statement',2)
para('The study asks whether the existing ORVEN prototype satisfies the supplied requirements for an e-commerce storefront and analytics dashboard. Although the application records orders, customer accounts, product categories, cart contents, and order items, several requested analytical views are not currently presented in the dashboard. Without requirement-by-requirement evaluation, the system could be described as a complete analytics solution despite lacking reports for product performance, cart abandonment, customer location, and category ranking.')
heading('Research Questions',3)
bullets(['Which of the supplied shopping, account, administration, and dashboard requirements are implemented in the existing ORVEN prototype?','What code and verification evidence supports each requirement status?','Which requirements are partially implemented or not implemented, and what additional data definitions or reports are needed to satisfy them?'])
heading('Objectives',2)
para('General objective. To evaluate the existing ORVEN prototype against the supplied requirements for an e-commerce analytics system using implementation evidence and documented software verification.')
bullets(['Translate the supplied feature list into explicit, testable requirements.','Inspect the existing storefront, administration dashboard, database schema, and documented test results.','Classify each requirement as implemented, partially implemented, or not implemented, with a reason for each classification.','Define measurable acceptance criteria and operational definitions for requested dashboard indicators.','Recommend a bounded development and verification plan for requirements that are not yet satisfied.'])
heading('Scope and Limitations',2)
add_table(['Included scope','Known limitation'],[
('Five supplied commerce/account requirements and seven requested dashboard indicators','Evaluation is of the existing application, not a new implementation of every requested indicator.'),
('Source inspection of storefront, dashboard, database schema, and project verification records','Requirements were supplied for the project; no separate stakeholder interviews or survey were conducted.'),
('Local automated and browser-test evidence documented by the project','The store, products, and order data are fictional; no real commercial or customer outcomes are measured.'),
('Assessment of available analytics data fields and current dashboard output','Payments are sandbox/test-mode; no live sales, real shipment, or representative location data are available.'),
('Recommendations for defining and verifying missing analytics','Hosted checkout verification is incomplete under the documented Cloudflare free-plan CPU limit.')], [3.05,3.25])

chapter('Chapter 2 — Current Process Analysis')
heading('Existing ORVEN Process and Analytics Gap',2)
para('The system was examined as implemented rather than compared with an undocumented manual workflow. The verified customer transaction path is product discovery, cart management, server-side price and promotion validation, checkout review, stock reservation, test-mode payment, and order tracking. Administrators separately manage products, inventory, and fulfillment and review the existing dashboard.')
heading('Existing Process Flow Chart',2); figure(ART/'system-flow.png','Figure 2.1. Implemented customer purchase and order workflow. The payment step is test-mode only.',6.35)
heading('Problems Identified Against the Supplied Requirements',2)
para('The primary documented problem is a requirements-coverage gap, not a measured failure of a real business process. The existing application has database records that could support some future analysis, but data availability alone does not satisfy a dashboard requirement. Each requested metric must have a defined population, time window, numerator/denominator where appropriate, privacy treatment, and visible report.')
add_table(['Requirement area','Current evidence','Gap or risk'],[
('Sales performance','Paid order value, total order count, and average paid order value.','Limited set of measures; no complete sales breakdown or comparison.'),
('Customer growth','Counts new registered customer accounts in selected period.','Does not measure visitors, repeat purchase, retention, or conversion.'),
('Product performance','Products, variants, categories, and order-line records exist.','No dashboard ranking by units, sales value, or conversion.'),
('Cart abandonment','Cart and cart-item records exist.','No defined abandonment window/rate or report; cart existence is not proof of intent.'),
('Revenue trends','Daily paid order value for selected 7-, 30-, or 90-day period.','No period-over-period comparison or forecasting.'),
('Customer location','Shipping details are stored on orders.','No aggregated location report; sensitive address information requires minimization.'),
('Top categories','Product category and order-item relationships exist.','No category aggregation or ranked dashboard report.')],[1.35,2.3,2.75])

chapter('Chapter 3 — Proposed IT Solution')
heading('System Description',2)
para('The proposed solution is a full-stack web application with two coordinated areas. The storefront enables customers to explore the catalogue, manage a cart, register or continue as a guest, select a delivery option, place a test transaction, and review order status. The administrator area centralizes catalogue, inventory, order, customer, promotion, communication, and reporting work behind server-enforced role checks.')
para('The application treats the database and server as the source of truth. Product prices and promotion rules are fetched again during checkout. Inventory reservation, promotion usage, order items, payment record, and audit entry are created within a transaction; insufficient stock causes the entire operation to roll back. Idempotency and database locking reduce duplicate or conflicting transactions.')
heading('Supplied System Requirements',2)
para('The following requirements are taken from the project specification supplied for this study. “Requested” describes the target scope, not a claim that each function is already implemented.')
add_table(['ID','Requirement','Testable acceptance criterion'],[
('F1','Online shopping','A visitor can browse published products and open product details.'),
('F2','Cart','A visitor can add a variant, change quantity, remove it, and review the current bag.'),
('F3','Checkout','A customer can submit an order and receive an order reference through the configured test payment flow.'),
('F4','Product management','An authorized administrator can create or edit a product and control its publication and variants.'),
('F5','Customer account','A customer can register/sign in and view account or order information.'),
('A1','Sales performance','Dashboard shows defined sales/order measures for a selectable reporting interval.'),
('A2','Customer growth','Dashboard shows new customer registrations for the selected interval.'),
('A3','Product performance','Dashboard ranks products using order-item units and/or paid sales value.'),
('A4','Cart abandonment rate','Dashboard reports eligible carts with no completed order divided by eligible carts, using an explicitly stated inactivity window.'),
('A5','Revenue trends','Dashboard plots paid order value by date for a selectable interval.'),
('A6','Customer location','Dashboard aggregates orders by a documented geographic level without exposing full addresses.'),
('A7','Top categories','Dashboard ranks categories using a defined measure, such as paid units or paid order value.')],[0.45,1.55,4.4])
heading('Research and Development Method',2)
para('A descriptive, artifact-based requirements evaluation was conducted. The analysis unit was each of the twelve supplied functional and analytics requirements. Evidence was collected by inspecting the current dashboard implementation, relevant application routes and interactions, the Prisma database schema, and project verification records dated 6 October 2026. Each requirement was classified using the following rubric: Implemented means a matching user-visible function is present and its relevant workflow is supported by recorded verification; Partially implemented means only a limited version is visible or a prerequisite capability exists without fulfilling the complete requested report; Not implemented means the requested user-visible function/report was not found in the inspected application. Existing tests support system-behavior claims only where their recorded scenarios apply.')
para('The assessment is reproducible at the feature level but is not a user study. No participants, real business process observations, production sales data, or controlled pre/post measurements were available. Consequently, this method can establish requirement coverage and documented software verification; it cannot establish customer satisfaction, causal quality improvement, or commercial impact.')
heading('Expected Improvements',2)
para('If completed and verified, the supplied analytics requirements would extend the existing operational dashboard with product-level and category-level results, a defined cart-abandonment measure, and privacy-preserving geographic summaries. In this study these are expected outcomes of future work, not observed improvements. Existing verified capabilities already provide a foundation for sales/order summaries, new account counts, and daily paid-order-value trends.')
heading('Users of the System',2)
bullets(['Guest customer — browses products, manages a cart, and may complete checkout without an account.','Registered customer — additionally maintains profile and address information and reviews order history.','Administrator — manages products, variants, collections, stock, orders, customers, promotions, inbox items, reports, and activity history.','External payment service — in Stripe test configuration, creates a hosted test checkout and sends verified webhook events.','System operator — configures database, deployment variables, scheduler, payment mode, and production services.'])
heading('Evaluation Procedure',2)
para('For each supplied requirement, the implementation was checked for an observable interface and supporting data path. Recorded automated and browser verification was used as supporting evidence, not as a substitute for requirements-specific tests. The result matrix in Chapter 6 identifies requirements without direct recorded evidence and states measurable acceptance checks that should be run before claiming full compliance.')

chapter('Chapter 4 — System Design')
heading('Use Case Diagram',2); figure(ART/'use-case.png','Figure 4.1. Major actors and use cases of the ORVEN system.',6.35)
heading('System Flow Chart',2); figure(ART/'system-flow.png','Figure 4.2. Proposed customer transaction and fulfillment flow.',6.35)
heading('Database Design',2)
para('The relational design separates identities, sessions, catalogue records, variants, inventory, carts, orders, payments, and shipments. Primary and foreign keys preserve relationships, while unique identifiers support lookup and idempotent processing. Monetary values are stored as integer cents. Additional implementation entities include promotions, stock movements, audit logs, newsletter signups, support messages, and rate limits.')
figure(ART/'database-design.png','Figure 4.3. Simplified entity-relationship view of the implemented PostgreSQL schema.',6.4)
heading('Analytics Measure Definitions for Acceptance Testing',2)
para('The following operational definitions are proposed to make the supplied dashboard requirements testable. They are design criteria for completing the analytics scope, not descriptions of reports currently displayed.')
add_table(['Measure','Proposed definition','Data/interpretation constraint'],[
('Sales performance','For a selected interval: paid order count, paid order value, and average paid order value (paid order value ÷ paid orders).','State whether “value” includes shipping and estimated tax; current dashboard includes them.'),
('Customer growth','Count of newly registered CUSTOMER accounts created during the interval.','Label as account registrations, not unique site visitors or retained customers.'),
('Product performance','Rank active products by paid units sold and paid line value during the interval.','Exclude pending/cancelled/failed orders; specify ties and date basis.'),
('Cart abandonment rate','Eligible carts inactive for at least 24 hours with no paid order ÷ all carts that reached a defined checkout-intent event in the same cohort.','Current schema lacks a dedicated checkout-intent/abandonment event; carts merely containing items should not be treated as confirmed intent.'),
('Revenue trend','Sum paid order value by calendar day in UTC for the selected interval.','Current dashboard already plots daily paid order value; specify refunds if refunds are later supported.'),
('Customer location','Count of paid orders grouped by country or region from the order shipping snapshot.','Display only aggregates; do not expose street-level address or small groups that could identify individuals.'),
('Top categories','Rank categories by paid units or paid line value, using the category on each ordered product.','Choose one primary ranking measure and use order-item snapshots/relations consistently.')],[1.15,2.65,2.7])
heading('Key Data Entities',2)
add_table(['Entity group','Purpose'],[
('Users, Sessions, Addresses, Password Resets','Identity, authentication, saved delivery details, and account recovery.'),('Collections, Products, Images, Variants','Catalogue structure, media, searchable product information, SKUs, attributes, and stock.'),('Carts and Cart Items','Persistent anonymous or account-based shopping selections.'),('Orders, Order Items, Payments','Immutable transaction snapshots, totals, fulfillment, tracking, and provider state.'),('Promotions','Discount rules, usage limits, validity, and use counts.'),('Stock Movements and Audit Logs','Reasoned stock movements and traceable administrative activity.'),('Support Messages, Newsletter, and Rate Limits','Stored contact/subscription records and request-throttling state.')],[2.2,4.1])
heading('Interface Design',2)
para('The visual system uses an ivory, stone, taupe, espresso, near-black, and restrained brass palette, with editorial display typography and readable interface typography. Layouts adapt to desktop and 360-pixel mobile screens. Forms use explicit labels and errors, navigation exposes the current area, charts include accessible values, and reduced-motion preferences are respected.')
bullets(['Storefront: editorial landing page, collections, product details, cart drawer/full bag, checkout, account, and order tracking.','Administration: persistent sidebar on desktop, compact mobile navigation, searchable lists, filters, pagination, editors, dialogs, dashboard panels, and CSV export actions.','Interaction safeguards: disabled/busy states, confirmation/review stages, required adjustment reasons, valid forward fulfillment transitions, and clear sandbox disclosures.'])

chapter('Chapter 5 — System Prototype')
heading('Login Page',2)
para('The account page supports registration, sign-in, one-use password reset links, and redirection to the appropriate customer or administrator destination. Passwords are hashed and sessions are stored with expiration. Figure 5.1 is a browser capture of the implemented sign-in page.')
figure(ART/'login-page.png','Figure 5.1. Implemented ORVEN sign-in page captured from the running local application.',6.35)
heading('Dashboard',2)
para('The administrator dashboard presents paid order value, order count, average paid order value, new customer accounts, a daily sales chart, fulfillment and low-stock queues, recent orders, quick actions, and recent activity for a selectable 7-, 30-, or 90-day period.')
figure(ART/'admin-dashboard-desktop.png','Figure 5.2. Verified desktop administrator dashboard.',6.35)
heading('Main Features',2)
para('The customer interface provides a responsive catalogue and detailed product experience. Product cards and pages expose imagery, price, attributes, stock conditions, colour/size options, related products, and cart actions. The admin editor manages product details, SEO information, images, variants, prices, stock-related metadata, and publication state.')
figure(ART/'product-desktop.png','Figure 5.3. Verified customer product detail interface.',6.35)
figure(ART/'admin-product-editor-desktop.png','Figure 5.4. Verified administrator product editor.',6.35)
heading('Reports',2)
para('The current dashboard offers 7-, 30-, and 90-day reporting periods; paid order value, total order count, average paid order value, new registered customer count, daily paid order value, fulfillment workload, low-stock count, recent orders, and recent audit activity. It does not currently display product rankings, a cart-abandonment rate, geographic distribution, or category rankings. Administrative CSV exports are available for products, orders, and inventory, with authorization and a 10,000-record cap; these exports are operational records, not substitutes for the requested dashboard analytics.')
figure(ART/'admin-products-desktop.png','Figure 5.5. Verified product-management list with search, sorting, status information, and export support.',6.35)
heading('Transactions',2)
para('A transaction begins with a server-priced cart and continues through delivery details, review, stock reservation, order creation, and test payment confirmation. Each order retains line items, address snapshot, subtotal, discount, delivery, tax estimate, total, provider state, fulfillment status, tracking, notes, and timeline. Retried checkout and payment confirmation are idempotent; cancellation or expiry restores reserved stock once.')
para('Administrator transaction handling occurs in the Orders section and dashboard queue. Only paid orders may advance through valid fulfillment stages, and shipped or delivered orders require carrier and tracking information. The Recent Orders table shown in Figure 5.2 provides the immediate transaction summary, while each order opens a complete detail and timeline view.')

chapter('Chapter 6 — Conclusion and Recommendations')
heading('Requirement Evaluation Results',2)
para('The following classification is based on the implementation inspected for this study. “Partially implemented” indicates that the dashboard contains a narrower measure than the supplied requirement; the classification does not imply the broader requirement has passed acceptance testing.')
add_table(['ID / requirement','Status','Implementation evidence and result'],[
('F1 Online shopping','Implemented','Responsive product discovery and product-detail routes exist; storefront scenarios are included in the documented browser verification.'),
('F2 Cart','Implemented','Persistent cart, quantity changes, promotion entry, and bag review are implemented; documented browser purchase scenario exercises the cart path.'),
('F3 Checkout','Implemented in test mode','Checkout, reservation, order creation, and sandbox/test payment are implemented and locally browser-tested; no live charge is made.'),
('F4 Product management','Implemented','Protected product/variant editor and inventory administration are implemented; admin browser scenarios verify price and stock workflows.'),
('F5 Customer account','Implemented','Account sign-in, profile/address workflows, order history, and protected routes exist; documented browser tests cover account access.'),
('A1 Sales performance','Partially implemented','Paid order value, order count, and average paid order value are shown; no richer sales breakdown or comparative analysis is shown.'),
('A2 Customer growth','Partially implemented','New registered-customer count is shown for the reporting interval; visitors, conversion, and retention are not measured.'),
('A3 Product performance','Not implemented','Product records and order lines exist, but no product sales ranking or product-performance dashboard report was found.'),
('A4 Cart abandonment rate','Not implemented','Cart storage exists, but no abandonment cohort, inactivity-based rate, or dashboard report was found.'),
('A5 Revenue trends','Partially implemented','A daily paid-order-value chart exists for 7/30/90 days; it has no period comparison or forecast.'),
('A6 Customer location','Not implemented','Order shipping snapshots contain address data, but no privacy-preserving geographic dashboard aggregation was found.'),
('A7 Top categories','Not implemented','Products have category values and order items reference variants, but no category ranking/report was found.')],[1.45,1.25,3.8])
heading('System Verification Evidence',2)
para('Project verification records dated 6 October 2026 report 28 unit/integration tests and 18 desktop/mobile browser scenarios passing after the PostgreSQL migration. The recorded tests cover selected pricing, transaction, account, storefront, and administration workflows; they are not a complete suite of acceptance tests for all twelve requirements. Selected automated accessibility checks found no violations for the tested pages and rule sets, but do not establish full accessibility conformance. Hosted validation reports initial successful checks followed by Cloudflare free-plan CPU-limit failures, so complete hosted checkout and browser verification remains outstanding.')
heading('How Verified Functions Support Quality',2)
para('The source and test evidence supports specific engineering properties of the existing implementation: server-side pricing and transactional inventory handling support data consistency; unique idempotency keys and transaction locks support retry behavior; searchable administrative records and daily summaries support operational visibility; and authorization/audit mechanisms support access control and traceability. The study did not measure a before-and-after change in business accuracy, response time, revenue, or customer satisfaction. Therefore, it cannot conclude that the system has empirically improved organizational quality.')
heading('Recommendations and Future Enhancements',2)
bullets(['Implement and test the four missing dashboard reports: product performance, cart abandonment, customer geography, and category ranking.','Before reporting cart abandonment, record or otherwise define checkout intent, cohort membership, inactivity window, and treatment of recovered/expired carts; do not infer abandonment from cart contents alone.','Define one authoritative revenue and product/category sales measure, including payment status, order date/time zone, discounts, shipping, tax, and later refund treatment.','Aggregate location at a privacy-appropriate geographic level and suppress small groups; never display customer street addresses in analytics.','Add acceptance tests with controlled fixtures for empty data, date boundaries, pending/failed orders, duplicate order retries, and expected ranking/tie outcomes.','Run usability testing with intended administrators only if participants can be recruited and ethical/consent requirements are met; report participant count, tasks, and observed results rather than inventing them.','Complete hosted checkout verification under an appropriate runtime plan and repeat the browser suite.','Profile and reduce client hydration and main-thread blocking; conduct manual accessibility review in addition to automated checks.'])
heading('Final Statement',2)
para('Within its academic and test-mode boundaries, ORVEN is a coherent, production-oriented prototype that replaces fragmented manual handling with structured customer and administrative workflows. Its strongest contribution is not only the storefront experience, but the coordinated control of pricing, stock, orders, fulfillment, security, and evidence for management decisions.')
heading('References and Project Records',1)
bullets([
    'ORVEN project README. System setup, implemented features, deployment notes, and known limitations. Repository project documentation, accessed 6 October 2026.',
    'ORVEN verification record. Local production-preview, unit/integration, browser, accessibility, and Lighthouse results dated 4 October 2026. Repository project documentation.',
    'ORVEN administrator verification record. Administration workflows, responsive browser checks, accessibility checks, and test results dated 6 October 2026. Repository project documentation.',
    'ORVEN Supabase migration verification record. PostgreSQL migration, table-count comparison, integration/browser tests, and Cloudflare hosted verification dated 6 October 2026. Repository project documentation.',
    'ORVEN Prisma schema. Relational models and constraints for the implemented PostgreSQL application. Repository source code, accessed 6 October 2026.'
])

# Header/footer
for section in doc.sections:
    hp=section.header.paragraphs[0]; hp.text='ORVEN | E-Commerce Management and Analytics System'; hp.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    for r in hp.runs: r.font.size=Pt(8); r.font.color.rgb=RGBColor.from_string(GRAY)
    fp=section.footer.paragraphs[0]; fp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    run=fp.add_run('ORVEN Research Paper  |  October 2026  |  Page '); run.font.size=Pt(8); run.font.color.rgb=RGBColor.from_string(GRAY)
    field(fp,'PAGE')

doc.core_properties.title='Development of an E-Commerce Management System with Integrated Sales, Customer, and Product Performance Analytics'
doc.core_properties.subject='System Development Research Paper'
doc.core_properties.author='[Researcher Name/s]'
doc.core_properties.keywords='ORVEN, e-commerce analytics, requirements evaluation, dashboard, system development'
doc.save(OUT)
print(OUT)
