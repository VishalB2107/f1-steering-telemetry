#streamlit run your_script.py
import streamlit as st
import os
import sys

from pathlib import Path

st.set_page_config(
        page_title="F1 Steering Angle Model",
        page_icon="https://img.icons8.com/external-soft-fill-juicy-fish/60/external-formula-vehicle-mechanics-soft-fill-soft-fill-juicy-fish.png",
        initial_sidebar_state="expanded",
        layout="wide"
    )

from utils.helper import BASE_DIR, metrics_page

if "visited" not in st.session_state:
    st.session_state["visited"] = True
    try:
        metrics_page.update_one({"page": "inicio"}, {"$inc": {"visits": 1}})
    except:
        st.warning("")

hide_decoration_bar_style = '''
    <style>
        header {visibility: hidden;}
    </style>
'''

logo_style = '''
    <style>
        .contact-icons {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        
        .contact-icon {
            display: flex;
            align-items: center;
            padding: 6px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
            text-decoration: none;
            color: #ffffff;
        }
        
        .contact-icon:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .contact-icon img {
            width: 16px;
            height: 16px;
        }
        
        .email-button {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px 15px;
            border-radius: 20px;
            background-color: rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
            text-decoration: none;
            color: #ffffff;
            font-size: 13px;
            margin-top: 12px;
            width: 100%;
        }
        
        .email-button:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .email-button img {
            width: 16px;
            height: 16px;
            margin-right: 8px;
        }
        
        .sidebar-separator {
            margin: 20px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
'''

st.markdown(logo_style, unsafe_allow_html=True)

with st.sidebar:
    st.markdown("<h3 style='text-align: center; color: #fff;'>Considerations</h3>", unsafe_allow_html=True)
    
    st.caption("""**Ouput Data**:""")
    st.markdown("<p style='text-align: left; color: gray; font-size: 12px;'>The model is trained with images from -180° to 180°, for the moment may not accurately predict angles beyond 180°. Poor or high-intensity lighting may affect data accuracy.</p>", unsafe_allow_html=True)
    
   

    st.markdown("<p style='text-align: left; color: gray; font-size: 12px;'> </p>", unsafe_allow_html=True)


pages = st.navigation({ 
    "Steering Angle Model": [
        st.Page(Path(BASE_DIR) / "navigation" / "steering-angle.py", title="Use Model"),
        st.Page(Path(BASE_DIR) / "navigation" / "soon.py", title="Historical Steering Data Base"),
    ],
})

pages.run()