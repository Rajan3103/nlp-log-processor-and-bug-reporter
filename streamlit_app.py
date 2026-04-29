import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from database import init_db, get_reports, add_reports_bulk, delete_report, clear_all_reports, update_report_status, get_stats, get_training_data
from nlp_engine import NLPEngine
from exporter import BugReportExporter
import os
import time
import io

# Page Config
st.set_page_config(
    page_title="Bug Identifier | Intelligent Processor",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize
init_db()
engine = NLPEngine()

# Custom CSS for "Wow" factor
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .main {
        background-color: #09090b;
        color: #fafafa;
    }
    
    .stApp {
        background: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #09090b 100%);
    }

    .glass-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 24px;
        padding: 2rem;
        margin-bottom: 1.5rem;
    }

    .stat-card {
        text-align: center;
        padding: 1.5rem;
    }

    .priority-critical { color: #ef4444; }
    .priority-high { color: #f97316; }
    .priority-medium { color: #f59e0b; }
    .priority-low { color: #10b981; }

    .sidebar .sidebar-content {
        background-color: rgba(0, 0, 0, 0.4);
    }

    h1, h2, h3 {
        font-weight: 800;
        letter-spacing: -0.05em;
    }

    .gradient-text {
        background: linear-gradient(90deg, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .stButton>button {
        border-radius: 12px;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.markdown("""
    <div style='display: flex; align-items: center; gap: 12px; margin-bottom: 2rem;'>
        <div style='width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 12px; display: flex; align-items: center; justify-content: center;'>
            <span style='font-size: 24px;'>📊</span>
        </div>
        <div>
            <h2 style='margin: 0; font-size: 20px;'>Bug <span style='color: #818cf8;'>Identifier</span></h2>
            <p style='margin: 0; font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.1em;'>Intelligent Processor</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    tab = st.radio("Navigation", ["Analytics", "Registry", "Processor", "Training Center"], label_visibility="collapsed")
    
    st.markdown("---")
    
    status_color = "#10b981" if engine.has_gemini else "#ef4444"
    status_text = "Nexus Online" if engine.has_gemini else "Nexus Offline"
    st.markdown(f"""
    <div style='display: flex; align-items: center; gap: 8px; padding: 0.5rem;'>
        <div style='width: 10px; height: 10px; border-radius: 50%; background: {status_color}; box-shadow: 0 0 10px {status_color}80;'></div>
        <span style='font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase;'>{status_text}</span>
    </div>
    """, unsafe_allow_html=True)

# Main Content
if tab == "Analytics":
    st.markdown("## System <span class='gradient-text'>Intelligence</span>", unsafe_allow_html=True)
    st.markdown("<p style='color: #71717a; margin-bottom: 2rem;'>Monitoring and classification of complex vector logs.</p>", unsafe_allow_html=True)

    reports = get_reports()
    stats = get_stats()

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
        <div class='glass-card stat-card'>
            <p style='font-size: 10px; font-weight: 800; color: #71717a; text-transform: uppercase;'>Active Issues</p>
            <p style='font-size: 3rem; font-weight: 900; margin: 0;'>{len(reports)}</p>
            <p style='font-size: 10px; color: #10b981; font-weight: 800;'>SYNCHRONIZED</p>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        critical_count = len([r for r in reports if r['priority'] == 'Critical'])
        st.markdown(f"""
        <div class='glass-card stat-card'>
            <p style='font-size: 10px; font-weight: 800; color: #71717a; text-transform: uppercase;'>Critical State</p>
            <p style='font-size: 3rem; font-weight: 900; margin: 0; color: #ef4444;'>{critical_count}</p>
            <p style='font-size: 10px; color: #ef4444; font-weight: 800;'>ACTION REQUIRED</p>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        unique_sources = len(set([r['source_file'] for r in reports]))
        st.markdown(f"""
        <div class='glass-card stat-card'>
            <p style='font-size: 10px; font-weight: 800; color: #71717a; text-transform: uppercase;'>Sources</p>
            <p style='font-size: 3rem; font-weight: 900; margin: 0;'>{unique_sources}</p>
            <p style='font-size: 10px; color: #3b82f6; font-weight: 800;'>UNIQUE VECTORS</p>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown(f"""
        <div class='glass-card stat-card'>
            <p style='font-size: 10px; font-weight: 800; color: #71717a; text-transform: uppercase;'>Latency</p>
            <p style='font-size: 3rem; font-weight: 900; margin: 0; color: #818cf8;'>0.8s</p>
            <p style='font-size: 10px; color: #818cf8; font-weight: 800;'>REAL-TIME</p>
        </div>
        """, unsafe_allow_html=True)

    if reports:
        col_left, col_right = st.columns([2, 1])
        
        with col_left:
            st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
            st.markdown("### Priority Map")
            p_df = pd.DataFrame(stats['priorityStats'])
            if not p_df.empty:
                fig = px.bar(p_df, x='priority', y='count', 
                             color='priority', 
                             color_discrete_map={
                                 'Critical': '#ef4444', 
                                 'High': '#f97316', 
                                 'Medium': '#f59e0b', 
                                 'Low': '#10b981'
                             },
                             template='plotly_dark')
                fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', showlegend=False)
                st.plotly_chart(fig, use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)

        with col_right:
            st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
            st.markdown("### Category Mix")
            c_df = pd.DataFrame(stats['categoryStats'])
            if not c_df.empty:
                fig = px.pie(c_df, names='category', values='count', 
                             hole=0.6,
                             color_discrete_sequence=px.colors.qualitative.Pastel)
                fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', showlegend=False)
                st.plotly_chart(fig, use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.info("No data available. Upload logs to see intelligence.")

elif tab == "Registry":
    st.markdown("## Issue <span class='gradient-text'>Registry</span>", unsafe_allow_html=True)
    
    reports = get_reports()
    
    col_search, col_actions = st.columns([2, 1])
    with col_search:
        search = st.text_input("Scan registry...", placeholder="Search by description, file or category...")
    with col_actions:
        col_btn1, col_btn2 = st.columns(2)
        with col_btn1:
            if st.button("Export PDF", use_container_width=True):
                if reports:
                    exporter = BugReportExporter(reports)
                    pdf_path = "bug_report_audit.pdf"
                    exporter.generate_pdf(pdf_path)
                    with open(pdf_path, "rb") as f:
                        st.download_button("Download Report", f, "audit_report.pdf", "application/pdf", use_container_width=True)
                else:
                    st.warning("No data to export.")
        with col_btn2:
            if st.button("Reset", use_container_width=True, type="secondary"):
                clear_all_reports()
                st.rerun()

    if search:
        reports = [r for r in reports if search.lower() in r['description'].lower() or search.lower() in r['source_file'].lower() or search.lower() in r['category'].lower()]

    if not reports:
        st.markdown("""
        <div style='text-align: center; padding: 5rem;'>
            <div style='font-size: 4rem; opacity: 0.2;'>📂</div>
            <h3 style='color: #71717a;'>Registry Is Empty</h3>
            <p style='color: #52525b;'>Initialize the pipeline to start processing logs.</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        for r in reports:
            p_color = {"Critical": "#ef4444", "High": "#f97316", "Medium": "#f59e0b", "Low": "#10b981"}.get(r['priority'], "#fff")
            with st.container():
                st.markdown(f"""
                <div class='glass-card'>
                    <div style='display: flex; justify-content: space-between; align-items: flex-start;'>
                        <div style='flex: 1;'>
                            <div style='display: flex; gap: 8px; margin-bottom: 1rem;'>
                                <span style='background: {p_color}20; color: {p_color}; border: 1px solid {p_color}40; padding: 2px 12px; border-radius: 99px; font-size: 10px; font-weight: 800;'>{r['priority']}</span>
                                <span style='background: rgba(255,255,255,0.05); color: #a1a1aa; padding: 2px 12px; border-radius: 99px; font-size: 10px; font-weight: 600;'>{r['category']}</span>
                                {"<span style='background: #10b98120; color: #10b981; border: 1px solid #10b98140; padding: 2px 12px; border-radius: 99px; font-size: 10px; font-weight: 800;'>VERIFIED</span>" if r.get('verified') else ""}
                                <span style='margin-left: auto; color: #52525b; font-size: 10px; font-weight: 800;'>{r['timestamp']}</span>
                            </div>
                            <h4 style='margin: 0; font-size: 1.25rem; font-weight: 700;'>{r['description']}</h4>
                            <p style='margin-top: 1rem; color: #71717a; font-size: 12px; font-weight: 600;'>📁 {r['source_file']} | ID: {r['id']:04d}</p>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
                cols = st.columns([6, 1, 1])
                with cols[1]:
                    if st.button("Verify", key=f"v_{r['id']}", use_container_width=True):
                        update_report_status(r['id'], 'Verified', verified=True)
                        st.success(f"Verified #{r['id']}")
                        time.sleep(0.5)
                        st.rerun()
                with cols[2]:
                    if st.button("Delete", key=f"d_{r['id']}", use_container_width=True):
                        delete_report(r['id'])
                        st.rerun()

elif tab == "Processor":
    st.markdown("<div style='text-align: center; padding-top: 2rem;'>", unsafe_allow_html=True)
    st.markdown("<span style='background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); padding: 4px 16px; border-radius: 99px; font-size: 12px; font-weight: 800;'>Available: Gemini 1.5 Flash</span>", unsafe_allow_html=True)
    st.markdown("## Pipeline <span class='gradient-text'>Inbound</span>", unsafe_allow_html=True)
    st.markdown("<p style='color: #71717a; font-size: 1.25rem;'>Deploy a dataset into the Bug Identifier engine for deep architectural analysis.</p>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

    uploaded_file = st.file_uploader("Transmit Log Data", type=["log", "txt", "csv", "pcap", "pcapng"], label_visibility="collapsed")
    
    if uploaded_file:
        st.markdown(f"""
        <div class='glass-card' style='text-align: center;'>
            <p style='font-size: 1.5rem; font-weight: 900; margin: 0;'>{uploaded_file.name}</p>
            <p style='font-size: 10px; color: #71717a; font-weight: 800;'>{uploaded_file.size / 1024:.1f} KB OF DATA IDENTIFIED</p>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("Run Vector Analysis", use_container_width=True, type="primary"):
            with st.spinner("Engaging Nexus Pipeline..."):
                content = engine.process_file_content(uploaded_file.read(), uploaded_file.name)
                reports = engine.analyze_with_gemini(content, uploaded_file.name)
                
                if reports:
                    for r in reports:
                        r['raw_content'] = content[:1000]
                    add_reports_bulk(reports)
                    st.success(f"Success: {len(reports)} issues identified and ingested.")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Nexus Pipeline failed to extract vectors. Ensure API Key is valid.")

    st.markdown("---")
    st.markdown("### Development Tools")
    if st.button("Seed with Sample Logs", help="Quickly populate the database with sample data for testing."):
        with st.spinner("Seeding nexus..."):
            with open("sample.log", "r") as f:
                content = f.read()
            reports = engine.analyze_with_gemini(content, "sample.log")
            if reports:
                for r in reports: r['raw_content'] = content[:1000]
                add_reports_bulk(reports)
                st.success("Database seeded successfully.")
                time.sleep(1)
                st.rerun()

    st.markdown("<div style='display: flex; gap: 1rem; margin-top: 3rem;'>", unsafe_allow_html=True)
    for step, desc in [("01 Vectorizing", "Metadata Extraction"), ("02 Nexus NLP", "Semantic Sorting"), ("03 Distribution", "Database Sync")]:
        st.markdown(f"""
        <div class='glass-card' style='flex: 1; text-align: center;'>
            <p style='color: #818cf8; font-weight: 800; font-size: 1rem; margin: 0;'>{step}</p>
            <p style='color: #71717a; font-size: 10px; font-weight: 800; text-transform: uppercase;'>{desc}</p>
        </div>
        """, unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

elif tab == "Training Center":
    st.markdown("## Training <span class='gradient-text'>Center</span>", unsafe_allow_html=True)
    st.markdown("<p style='color: #71717a; margin-bottom: 2rem;'>Teach the local model using verified bug reports.</p>", unsafe_allow_html=True)

    training_data = get_training_data()
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"""
        <div class='glass-card'>
            <h3>Verified Dataset</h3>
            <p style='font-size: 3rem; font-weight: 900; margin: 0;'>{len(training_data)}</p>
            <p style='font-size: 10px; color: #71717a; font-weight: 800;'>RECORDS READY FOR TRAINING</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        model_status = "READY" if engine.local_model else "NOT TRAINED"
        st.markdown(f"""
        <div class='glass-card'>
            <h3>Model Status</h3>
            <p style='font-size: 3rem; font-weight: 900; margin: 0; color: {"#10b981" if engine.local_model else "#71717a"};'>{model_status}</p>
            <p style='font-size: 10px; color: #71717a; font-weight: 800;'>LOCAL RANDOM FOREST</p>
        </div>
        """, unsafe_allow_html=True)

    if st.button("Initialize Local Training", type="primary", disabled=len(training_data) < 5):
        with st.spinner("Training local neural vectors..."):
            success, msg = engine.train_local_model(training_data)
            if success:
                st.success(msg)
                time.sleep(1)
                st.rerun()
            else:
                st.error(msg)
    
    if len(training_data) < 5:
        st.warning("You need at least 5 verified reports in the registry to train the local model.")

    if engine.local_model:
        st.markdown("### Model Diagnostics")
        st.info("Local model is active and providing fallback classification suggestions.")
        
        test_desc = st.text_area("Test Local Classifier", placeholder="Enter a log line or description...")
        if test_desc:
            pred = engine.predict_local(test_desc)
            st.json(pred)
