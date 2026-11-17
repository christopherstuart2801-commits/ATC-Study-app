/* Camp Pendleton Tower lesson cards for Local Control.
   Wording is the transcribed paper. Prompts only. Answers are not stored here. */
(function (root) {
  'use strict';

  function ref(cite, title, kind) {
    return kind ? [cite, title, kind] : [cite, title];
  }
  function hdr(title) { return [title, '', 'hdr']; }
  function listed(cite, title) { return [cite, title, 'listed']; }

  var JO = '7110.65';
  var FAC = 'FACMAN';

  var LOCAL_LQ = [
    {
      n: 1,
      id: 'LTG 1',
      ids: ['LTG 1'],
      t: 'Camp Pendleton Course Rules',
      full: 'Camp Pendleton Course Rules',
      req: 'Describe local area/airfield specific information.',
      perf: 'Pass a written examination. Reference: FACMAN, AOM, and DOD FLIP',
      localLq: true,
      test: [],
      refs: [
        hdr('FACMAN'),
        ref('FACMAN TBL 5-2', 'Special VFR Routes'),
        hdr('AOM'),
        listed('AOM 3000.1-6', 'General'),
        listed('AOM 3001', 'Aircraft Parking Procedures'),
        listed('AOM 3003', 'Traffic Patterns and Authorized Operations'),
        listed('AOM 3004', 'Helicopter/Tilt-Rotor Reporting Points'),
        listed('AOM 3005', 'Departure Procedures'),
        listed('AOM 3006', 'VFR Departure Procedures - Helicopter'),
        listed('AOM 3007', 'VFR Departure Procedures - Fixed Wing/Tilt-Rotor'),
        listed('AOM 3008', 'VFR Arrival Procedures - Helicopter'),
        listed('AOM 3009', 'VFR Arrival Procedures - Tilt-Rotor'),
        listed('AOM 3010', 'VFR Arrival Procedures - Fixed Wing/MV-22 Airplane Mode'),
        listed('AOM 3011', 'IFR Arrival Procedures'),
        listed('AOM 3012', 'Helicopter SVFR Operations'),
        listed('AOM 3014', 'Emergency Procedures/Lost Communications'),
        listed('AOM 3015', 'Special Use Areas'),
        listed('AOM 3016', 'Noise Abatement/Over Flight Restrictions'),
        listed('AOM Appendix E', 'Local Traffic Pattern')
      ],
      sim: {
        title: 'Simulation 1 - TOWER ARRIVALS / DEPARTURES',
        items: [
          ['Depart an aircraft from full length', 10],
          ['from an intersection', 10],
          ['from a helo spot', 10],
          ['from a surface not visible from the tower', 6.25],
          ['from a non-movement area', 6.25],
          ['SVFR while field is IFR', 6.25],
          ['Land safely an aircraft experiencing lost communications (with wingman, and without)', 6.25],
          ['Land on the runway', 10],
          ['Land on a helo spot', 10],
          ['Land at an LZ not visible from the tower', 6.25],
          ['Land SVFR while field is IFR', 6.25],
          ['Wave off with VISCOM', 6.25],
          ['Wave off without VISCOM', 6.25]
        ]
      },
      exercise: {
        title: 'Exercise 1 (TLC 1 Exam Prep)',
        prompts: [
          '1 Visual Reporting Points: a Name the visual reporting points used for arrival/departure routes in the class Delta surface area. b Name the intermediate reporting points.',
          '2 Traffic Patterns and Authorized Operations: a What operations are authorized on Runway 21/3? b State all the altitudes for the northwest and southeast pattern. c State the break altitudes for the NW and SE Pattern. d Define the boundaries of the right/left grass. e Discuss all of the traffic pattern procedures contained in the AOM 3003 3b-3j. f Discuss helo spot operations to include the Emergency Landing Pad. g Discuss all special operations listed in 3003 subparagraph 6. h Can aircraft make a direct entry into the tower pattern from the punchbowl without first requesting with the tower?',
          '3 VFR Helicopter/Tilt rotor Arrival procedures: a State the inbound altitude for all VFR inbound routes for Helicopter/tilt rotor aircraft.',
          '4 VFR Helicopter/Tilt rotor Departure Procedures: a State the outbound altitudes for all VFR outbound routes for Helicopters/Tilt rotor aircraft.',
          '5 VFR Fixed wing/MV22 airplane mode arrival procedures: a State the inbound altitudes for all VFR inbound routes for fixed wings and MV22 in airplane mode. b Define the GCA downwind.',
          '6 VFR Fixed wing/MV22 airplane mode departure procedures: a State the outbound altitudes for all VFR outbound routes for fixed wings and MV22 in airplane mode.',
          '7 Noise Abatement/Over Flight Restrictions/Quiet Hours: a Explain the different type of quiet hour modifications and where they apply. b State the areas and altitudes for all areas on or near Camp Pendleton that have over flight restrictions.',
          "8 General AOM Ch. 3: a What is the purpose for MCAS Camp Pendleton's course rules? b What are the LZ's contained in Camp Pendleton's CDSA? c When operating in the class D, what should pilots use as a means of avoidance? d What are the overflight avoidance areas in the class D?",
          '9 Departure Procedures: a What are the different course rules airspeeds for the class D?',
          '10 Special Use Areas: a Which CALA spots are specifically designated for the loading and unloading of hazardous cargo? b What are all the approved hot brake parking areas?',
          '11 Emergency Procedures: a What are the VFR lost communications in the class D?'
        ]
      }
    },
    {
      n: 2,
      id: 'ACAD-0529',
      ids: ['ACAD-0529'],
      t: 'Phraseology and Communications',
      full: 'Phraseology and Communications',
      req: 'Define the proper ATC phraseology/communications procedures as it applies to local control.',
      perf: 'Pass an examination.',
      localLq: true,
      test: [],
      refs: [
        hdr('7110.65'),
        ref(JO + ' 2-1-5', 'Expeditious compliance'),
        ref(JO + ' 2-1-18', 'Operational Requests'),
        ref(JO + ' 2-1-25', 'Wheels down check'),
        ref(JO + ' 2-4-3', 'Pilot Acknowledgement/read Back'),
        ref(JO + ' 2-4-15', 'Emphasis for clarity'),
        ref(JO + ' 3-1-6', 'Traffic information'),
        ref(JO + ' 3-1-10', 'Observed abnormalities'),
        ref(JO + ' 3-1-13', 'Establishing two-way communications'),
        ref(JO + ' 3-2-1', 'Light signals'),
        ref(JO + ' 3-2-3', 'Receiver-only acknowledgement'),
        ref(JO + ' 3-3-3', 'Timely information'),
        ref(JO + ' 3-5-1', 'Runway selection'),
        ref(JO + ' 3-9-1', 'Departure Information'),
        ref(JO + ' 3-9-3', 'Departure control instructions'),
        ref(JO + ' 3-9-4', 'Line up and wait'),
        ref(JO + ' 3-9-10', 'Takeoff clearance'),
        ref(JO + ' 3-9-11', 'Cancellation of takeoff clearance'),
        ref(JO + ' 3-10-1', 'Landing information'),
        ref(JO + ' 3-11-2', 'Helicopter takeoff clearance'),
        ref(JO + ' 4-3-1', 'Departure terminology'),
        ref(JO + ' 4-3-4', 'Departure Release, Hold for Release, Release Times, Departure Restrictions'),
        listed(JO + ' PCG', 'Arrival Time'),
        listed(JO + ' PCG', 'Departure Time'),
        hdr('FACMAN'),
        ref(FAC + ' 5-1-12', 'Night Vision Operations (NITEX)'),
        ref(FAC + ' 5-4-4', 'SCT Coordination'),
        ref(FAC + ' 5-5-2', 'Lost Communications'),
        ref(FAC + ' 5-5-6', 'IFR Departure Procedures'),
        ref(FAC + ' 5-5-12', 'IFR Arrivals'),
        ref(FAC + ' 6-2-7', 'VISCOM Procedures'),
        ref(FAC + ' 6-2-8', 'GCA - Tower Coordination Without VISCOM'),
        ref(FAC + ' 6-2-9', 'GCA Traffic Information'),
        ref(FAC + ' 6-2-10', 'Tower Clearances')
      ],
      sim: {
        title: 'Simulation 2 - TOWER PHRASEOLOGY',
        items: [
          ['Issue a wheels down check', 10],
          ['Utilize the phraseology to exit an aircraft from a runway when expeditious compliance is required', 5],
          ['Establish two way radio communications with aircraft', 5],
          ['Properly abbreviate call signs and facility ID', 10],
          ['Clear an aircraft to land when it is receiver only', 10],
          ['Land an aircraft with proper light gun signal', 10],
          ['Issue proper departure control instructions', 10],
          ['Change an aircraft to departure control', 5],
          ['Issue instructions for an aircraft to line up and wait', 10],
          ['Clear an aircraft for departure', 5],
          ['Cancel a takeoff clearance due to runway incursion', 10],
          ['Issue correct NITEX phraseology', 10]
        ]
      },
      exercise: {
        title: 'Exercise 2 (TLC 2 Exam Prep)',
        prompts: [
          '1 Light Guns: a Describe all of the light gun signals.',
          '2 Expeditious Compliance: a Describe the difference between expeditious and prompt compliance.',
          '3 Operational Requests: a What are all of the ways you can respond to an operational request?',
          '4 Wheels Down Check: a How and when do you issue a wheels down check to pilots? b What is the intent of the wheels down check?',
          '5 Pilot Acknowledgement/Read Back: a Ensure pilots ____ all Air Traffic Clearances and ATC Instructions. b When a pilot does read back an ATC clearance or instruction, what 3 things must you ensure?',
          '6 Traffic Information: a How do you describe the relative position of traffic? Give examples.',
          "7 Establishing Two-Way Communications: a What is the proper phraseology to instruct an aircraft to remain outside tower's airspace? b What must aircraft have prior to entering Class D airspace?",
          '8 Runway Selection: a Who is responsible for determining which runway is designated as the RUNWAY IN USE? b What determines the use of the calm wind runway? c When should you assign the runway most nearly aligned with the wind as the active runway?',
          '9 Departure Information: a What departure information are you responsible for providing to departing aircraft? b What may be omitted if the pilot states "have the numbers?"',
          '10 Departure Control Instructions: a What aircraft will you instruct to "change to departure?" b If you forget to instruct a pilot to change to departure on the ground, when may you instruct them to change to departure after they have taken off?',
          '11 Line Up and Wait (LUAW): a What is the intent of LUAW? b What is the phraseology to instruct a pilot to line up and wait? c An aircraft should not be in LUAW for how long without additional instructions?',
          '12 Takeoff Clearance: a What is the phraseology for clearing an aircraft for takeoff? b What is the phraseology for clearing an aircraft for takeoff from an intersection? c When two or more aircraft call you ready for departure, one at Delta, one at Alpha, and one at Echo 2, what must you state in your clearance?',
          '13 Landing Information: a What landing information are you responsible with providing to arriving aircraft? b If a pilot states they "have the numbers," does this indicate they have the ATIS broadcast?',
          '14 Departure Release, Hold for Release, Release Times, Departure Restrictions: a What is the proper way to inform a pilot or a controller that a departure clearance is not valid until additional instruction are received? b What is the phraseology for issuing a release and a clearance void time?',
          '15 Lost Communication: a What are the Class D VFR lost communication procedures? b What is the receiver only acknowledgement for both FW and RW during the day and night?',
          '16 VISCOM Procedures: a At what mileage will a go around be issued if the local controller does not issue a clearance?',
          '17 Tower Clearances: a Per the FACMAN, what is the phraseology for altitude restricted low approaches?'
        ]
      }
    },
    {
      n: 3,
      id: 'ACAD-0530 / ACAD-0531',
      ids: ['ACAD-0530', 'ACAD-0531'],
      t: 'Vehicle and Aircraft Separation, Spacing & Sequencing (TERMINAL)',
      full: 'Vehicle and Aircraft Separation, Spacing & Sequencing (TERMINAL)',
      req: 'Define separation criteria for air traffic in the terminal area. Describe how to provide ATC services based upon observed or known traffic and airport conditions per the references. Describe criteria for spacing/sequencing/separation in the terminal environment.',
      perf: 'Pass a written examination. Reference: 7110.65, 7110.126, and local directives and publications.',
      localLq: true,
      test: [],
      refs: [
        hdr('7110.65'),
        ref(JO + ' 2-1-2', 'Duty priority'),
        ref(JO + ' 2-1-4', 'Operational priority'),
        ref(JO + ' 3-1-9', 'Use of tower radar displays'),
        ref(JO + ' 3-5-1', 'Runway selection'),
        ref(JO + ' 3-8-1', 'Sequence/spacing application'),
        ref(JO + ' 3-8-2', 'Touch-and-go or stop-and-go or low approach'),
        ref(JO + ' 3-8-3', 'Simultaneous same direction operation'),
        ref(JO + ' 3-8-4', 'Simultaneous opposite-direction operation'),
        ref(JO + ' 3-9-4', 'Line up and wait'),
        ref(JO + ' 3-9-5', 'Anticipating separation'),
        ref(JO + ' 3-9-6', 'Same runway separation'),
        ref(JO + ' 3-9-7', 'Wake turbulence separation for intersection departures'),
        ref(JO + ' 3-10-1', 'Landing information'),
        ref(JO + ' 3-10-7', 'Landing clearance without visual observation'),
        ref(JO + ' 3-10-8', 'Withholding landing clearance'),
        ref(JO + ' 3-10-9', 'Runway exiting'),
        ref(JO + ' 3-10-10', 'Altitude restricted low approach'),
        ref(JO + ' 7-5-1', 'Authorization'),
        ref(JO + ' 9-7-3', 'Parachute operations in Class D airspace'),
        listed(JO + ' PCG', 'Aircraft wake turbulence categories'),
        hdr('FACMAN'),
        ref(FAC + ' 2-1-8', 'Class D airspace'),
        ref(FAC + ' 2-1-9', 'Class E airspace'),
        ref(FAC + ' 5-1-3', 'Radial and distance of visual reporting points'),
        listed('AOM Ch. 3', 'Radial and distance of visual reporting points'),
        ref(FAC + ' 5-1-14', 'Areas one and two'),
        ref(FAC + ' 5-2-6', 'Coordination and Phraseology with Local Control'),
        listed('FAC DIR 25-12', 'Coordination and Phraseology with Local Control'),
        ref(FAC + ' 5-5-3', 'Coordination between positions'),
        ref(FAC + ' 5-5-4', 'Preferred runway use'),
        ref(FAC + ' 5-5-8', 'Section departures and arrivals'),
        ref(FAC + ' 5-5-20', 'Tower traffic pattern altitudes'),
        hdr('7110.126'),
        listed('7110.126 Appendix A', 'Aircraft Wake Categories'),
        listed('7110.126 Appendix B-3', 'Same Runway Separation'),
        listed('7110.126 Appendix B-6', 'Wake Turbulence Separation for Intersection Departures')
      ],
      sim: {
        title: 'Simulation 3 - TOWER PROFICIENCY #1',
        items: [
          ['Issue a safety alert for lawnmowers in the north grass', 2.5],
          ['Land an aircraft on a shortened runway', 2.5],
          ['Depart an aircraft from a shortened runway', 2.5],
          ['Safely land an aircraft with hung ordnance', 2.5],
          ['Clear an aircraft for a low approach', 5],
          ['for a stop-and-go', 5],
          ['for a touch-and-go', 5],
          ['Sequence aircraft properly to prevent simultaneous same runway operations', 10],
          ['Properly depart a CAT I aircraft behind a CAT I', 10],
          ['a CAT I behind a CAT II', 10],
          ['any aircraft behind a CAT III', 10],
          ['Anticipate separation while landing an aircraft', 10],
          ['Depart a small aircraft from an intersection, behind a large aircraft', 10],
          ['Depart a small aircraft from any taxiway, behind a heavy aircraft', 10],
          ['Issue accurate and relevant landing information', 5]
        ]
      },
      exercise: {
        title: 'Exercise 3 (TLC 3 Exam Prep)',
        note: 'Page 13 was not photographed. Exercise 3 may continue there.',
        prompts: [
          '1 Class D airspace: a What are the dimensions for Delta airspace?',
          '2 Class E airspace: a What are the dimensions for Echo airspace?',
          "3 Visual reporting points: a State all the radials and distance for Camp Pendleton's VFR reporting points.",
          '4 Duty priority: a Describe your duty priority.',
          '5 Operational Priority: a Describe your operational priority.',
          '6 Tower Traffic Pattern Altitudes: a List all of the downwind pattern altitudes and break altitudes.',
          '7 Use of Tower Radar Displays: a List the 4 purposes you may use the certified tower radar display for. b Can you radar contact an aircraft from the CTRD?',
          '8 Preferred Runway Use: a What is the calm wind runway? b What is the precision approach runway?',
          '9 Simultaneous Same Direction Operation: a Under what conditions may you authorize simultaneous same direction operations? b What are all of the required minima?',
          '10 Simultaneous Opposite Direction Operation: a Under what conditions may you authorize simultaneous same direction operations? [sic - paper says "same"; likely means opposite] b What are all of the required minima?',
          '11 Anticipating Separation: a Define anticipating separation in reference to issuing a takeoff clearance. b Define anticipating separation in reference to issuing a landing clearance.',
          '12 Runway Exiting: a What is the phraseology for issuing runway exiting instructions? b When should exiting instructions be issued to a pilot?',
          '13 Altitude Restricted Low Approach: a What is the minimum altitude for a restricted low approach? b What should the restriction be if a heavy aircraft was conducting the restricted low approach? c Can you issue an altitude restricted low approach over an aircraft holding in position or a departing aircraft?'
        ]
      }
    },
    {
      n: 4,
      id: 'ACAD-0526',
      ids: ['ACAD-0526'],
      t: 'Visual Separation, Types of Approaches, VFR-on-Top, and Emergencies',
      full: 'Visual Separation, Types of Approaches, VFR-on-Top, and Emergencies',
      req: 'Conduct the following IAW the reference as applicable.',
      perf: 'Pass a written examination. Reference: JO 7110.65 and local directives/publications',
      localLq: true,
      test: [],
      refs: [
        hdr('7110.65'),
        ref(JO + ' 2-1-8', 'Minimum Fuel'),
        ref(JO + ' 2-6-3', 'Reporting Weather Conditions'),
        ref(JO + ' 3-1-3', 'Use of Active Runways'),
        ref(JO + ' 3-10-3', 'Same Runway Separation'),
        ref(JO + ' 3-10-7', 'Landing Clearance Without Visual Observation'),
        ref(JO + ' 3-11-2', 'Helicopter Takeoff Clearance'),
        ref(JO + ' 7-2-1', 'Visual Separation'),
        ref(JO + ' 7-3-1', 'VFR-On-Top'),
        ref(JO + ' 7-4-1', 'Visual Approach'),
        ref(JO + ' 10-1-1', 'Emergency Determinations'),
        ref(JO + ' 10-2-1', 'Information Requirements'),
        ref(JO + ' 10-2-5', 'Emergency Situations'),
        ref(JO + ' 10-2-10', 'Emergency Locator Transmitter (ELT) Signals'),
        ref(JO + ' TBL 2-3-12', 'Miscellaneous Abbreviations'),
        hdr('DOD FLIP'),
        listed('DOD FLIP NFG', 'List and define the types of approaches'),
        listed('DOD FLIP NFG', 'Final Approach Fixes'),
        listed('DOD FLIP NFG', 'Navaids used by each approach'),
        listed('DOD FLIP', 'Radar minimums'),
        hdr('FACMAN'),
        ref(FAC + ' TBL 5-9', 'VFR-On-Top Altitude Assignment'),
        ref(FAC + ' TBL 5-2', 'Special VFR Routes'),
        ref(FAC + ' TBL 5-4', 'VFR-On-Top Clearance Limits'),
        ref(FAC + ' 5-5-6', 'IFR Departure Procedures'),
        ref(FAC + ' 5-5-14', 'LZ Phoenix'),
        ref(FAC + ' TBL 6-2', 'GCA Critical Data')
      ],
      sim: {
        title: 'Simulation 4 - TOWER PROFICIENCY #2',
        items: [
          ['Determine if an aircraft is in an emergency situation', 10],
          ['Properly handle a common emergency for Camp Pendleton', 10],
          ["Land a section of MV22's with GCA traffic in trail", 15],
          ['Land a fixed wing aircraft with tower pattern traffic on final in the left/right downwind (RWY 21/3)', 10],
          ['Properly control an overhead maneuver', 10],
          ['Properly issue left/right breaks to helo and fixed wing aircraft', 10],
          ['Hold an aircraft at a visual reporting point to aid sequencing', 10],
          ['Approve a pipeline patrol aircraft through the class D airspace with proper beacon code', 10],
          ['Issue a landing clearance without visual observation', 5],
          ['Clear an aircraft for a restricted low approach', 10]
        ]
      },
      exercise: {
        title: 'Exercise 4 (TLC 4 Exam Prep)',
        prompts: [
          '1 What is the minimum required information the local controller needs when a pilot declares an emergency?',
          '2 Reporting Weather Conditions: a State the basic VFR minimums.',
          '3 GCA critical data: a What is the PAR glideslope angle? b What is decision height? c What is the highest airport obstruction? d What is the highest class D obstruction?',
          '4 What will an aircraft executing a missed approach do?',
          '5 Name each type of IFR approach, and their radar minimums',
          '6 Helicopter Takeoff Clearance: a How would you handle a pilots request to depart from a non-movement area?',
          '7 Explain visual separation.',
          '8 Which individuals are allowed to declare an emergency?',
          '9 Same Runway Separation: a When may a controller apply visual separation?',
          '10 Visual Approach: a When does an aircraft cleared for a visual approach no longer receive IFR separation? b What is a visual approach?',
          '11 Emergency Determinations: a What is the difference between "Mayday" and "Pan-Pan?"',
          '12 Emergency Situations: a Who can declare emergencies?',
          '13 LZ Phoenix: a What are the operating altitudes for aircraft in LZ Phoenix? b What weather conditions must exist for aircraft to operate in LZ Phoenix? c What is the LZ Phoenix common frequency?',
          '14 GCA Critical Data: a List all the GCA Critical Data contained in TBL 6-2.'
        ]
      }
    },
    {
      n: 5,
      id: 'ACAD-0525',
      ids: ['ACAD-0525'],
      t: 'Special VFR',
      full: 'Special VFR',
      req: 'Identify the guidelines and criteria required for special VFR operations to include:',
      perf: 'Pass a written examination. References: JO 7110.65 and local directive and publications.',
      localLq: true,
      test: [],
      refs: [
        hdr('7110.65'),
        ref(JO + ' 2-1-1', 'ATC Service'),
        ref(JO + ' 2-1-4', 'Operational Priority'),
        ref(JO + ' 3-1-3', 'Use of Active Runways'),
        ref(JO + ' 3-1-12', 'Visually Scanning Runways'),
        ref(JO + ' 3-2-1', 'Light Signals'),
        ref(JO + ' 3-8-1', 'Sequence/Spacing Application'),
        ref(JO + ' 3-9-4', 'Line Up and Wait'),
        ref(JO + ' 3-10-5', 'Landing Clearance'),
        ref(JO + ' 7-5-1', 'Authorization'),
        ref(JO + ' 7-5-2', 'Priority'),
        ref(JO + ' 7-5-4', 'Altitude'),
        ref(JO + ' 7-5-6', 'Climb to VFR'),
        ref(JO + ' 10-2-1', 'Information Requirements'),
        hdr('FACMAN'),
        ref(FAC + ' 2-1-8', 'Class D Airspace'),
        ref(FAC + ' 5-1-7', 'Special VFR Flights'),
        ref(FAC + ' TBL 5-2', 'Special VFR Routes'),
        ref(FAC + ' TBL 5-5', 'SVFR Route Abbreviations'),
        listed(FAC + ' Appendix C-10', 'SVFR Lost Communications'),
        hdr('NAVAIR'),
        listed('NAVAIR 9.1.3.1', 'Local Control Duties and Responsibilities')
      ],
      sim: {
        title: 'Simulation 5 - TOWER MISC',
        items: [
          ['Approve an aircraft into class D on SVFR while the field is IFR', 20],
          ['Properly sequence a SVFR aircraft for landing while IFR aircraft are present', 20],
          ['Properly approve and sequence aircraft into class D on SVFR with other SVFR aircraft established in the tower pattern', 20],
          ['Correctly issue traffic advisory information to an RFC position', 20],
          ['Sequence a NORDO aircraft for landing and issue the appropriate light gun signals', 20]
        ]
      },
      exercise: {
        title: 'Exercise 5 (TLC 5 Exam Prep)',
        prompts: [
          '1 Use of Active Runways: a Who is responsible for operations conducted on the active runway? b ____ control must obtain approval from ____ control before authorizing an aircraft or a vehicle to cross or use any portion of an active runway.',
          '2 Light Signals: a List all light signals contained in FAA JO 7110.65 TBL 3-2-1.',
          '3 Landing Clearance: a What is the correct way to issue a landing clearance to an aircraft at a military airport?',
          '4 Authorization: a Where can aircraft be authorized to conduct SVFR operations? b Can controllers issue SVFR clearances when they deem it necessary? If not, why? c Can aircraft be cleared SVFR when the airport is reporting VFR conditions?',
          '5 Altitude: a Can you assign fixed altitudes to SVFR aircraft?',
          '6 Special VFR Lost Communications: a What are the lost communication procedures for the 3 scenarios contained in FACMAN App. C-10?',
          '7 Special VFR Flights: a What are the proper vertical and horizontal separation methods between IFR and SVFR aircraft operating in the class D? b When do SVFR operations have to be secured in reference to inbound IFR aircraft? c What are the weather requirements and routes that are authorized for SVFR operations? d What aircraft are authorized to conduct SVFR operations in Camp Pendleton\'s class D?'
        ]
      }
    },
    {
      n: 6,
      id: 'EQPT-2003',
      ids: ['EQPT-2003'],
      t: 'Operate fixed control tower structure equipment',
      full: 'Operate fixed control tower structure equipment',
      req: 'While in a fixed tower and given the required equipment, operate the following.',
      perf: 'Complete the required items IAW the reference. Proper operation was demonstrated with no assistance from the instructor. Instructor: BI. Reference: Applicable equipment operator manuals, NAVAIR 00-80T-114, and local directives and publications.',
      localLq: true,
      event: true,
      test: [],
      refs: [
        hdr('Reference'),
        listed('Equipment operator manuals', 'Applicable equipment operator manuals'),
        listed('NAVAIR 00-80T-114', 'NAVAIR 00-80T-114'),
        listed('Local directives', 'Local directives and publications')
      ],
      checks: [
        'Airfield lighting and visual landing aids control',
        'Digital Altimeter Setting Indicator (DASI), Wind direction and speed indicator, and Digital reading clock',
        'Navigational aide monitor(s) (unless located in the radar room), and identify equipment status',
        'Read weather dissemination or display device, Wind direction and speed indicator, and Automatic Terminal Information Service (ATIS)',
        'Utilize counters for recording aircraft operations',
        'Operate tower radar display',
        'Operate aircraft control, inter/intrafacility, emergency communications and crash/fire net',
        'Operate Flight Data Input/Output (FDIO), and Flight progress strip Holders',
        'VISCOM, and air traffic control signal lamp',
        'Use Crash phone, crash alarm, evacuation alarm controls, and airfield incident response map per NAVAIR 00-80R-14',
        'Remote video camera display',
        'Use binoculars (at least two pair of 7x50 power or stronger)'
      ]
    },
    {
      n: 7,
      id: 'COMM-2206',
      ids: ['COMM-2206'],
      t: 'Operate ATC communications equipment',
      full: 'Operate ATC communications equipment',
      req: 'Operate the following communications equipment.',
      perf: 'Complete the requirement items IAW the references. Communication equipment was set up and programmed accurately and a line check was performed without error. Instructor: BI. References: Applicable equipment operator manuals.',
      localLq: true,
      event: true,
      test: [],
      refs: [
        hdr('Reference'),
        listed('Equipment operator manuals', 'Applicable equipment operator manuals')
      ],
      checks: [
        'Transmitter/receiver control panel(s)',
        'Backup/emergency transmitter/receiver location and controls',
        'Emergency communications system (ECS)',
        'Crash phone',
        'Intercom units',
        'Telephones',
        'VIDS (as applicable)'
      ]
    }
  ];

  root.VATC_LOCAL_LQ = LOCAL_LQ;
  if (typeof module !== 'undefined' && module.exports) module.exports = LOCAL_LQ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
