"use strict";

const express = require('express');
const router = express.Router();

module.exports = (knex, room8) => {

  //sumitting a new poll
  router.post("/:id", (req, res) => {
    try {
      let templateVars = {
        answers: req.body.answers.map(ans => parseInt(ans)) //request answer is type string
      };

      knex.select(knex.raw("polls.id as poll_id, forward_emails, email, question, description, answers, options, submissions.id"))
        .from('polls')
        .join('submissions', 'polls.id', '=', 'submissions.poll_id')
        .where("submissions.id", '=', req.params.id)
        .then((rows) => {
          knex("submissions")
            .where("id", "=", req.params.id)
            .update({
              'answers': templateVars.answers
            })
            .then(() => {
              let still_active = true;
              room8.updatePollStatus(rows[0].poll_id, still_active);
              const hostname = (req.hostname === 'localhost' ? `${req.hostname}:8080` : req.hostname);
              const mailerData = {
                templateName: "new_vote",
                emailVars: {
                  hostname: hostname,
                  pollID: rows[0].poll_id,
                  pollName: rows[0].question
                }
              }
              
              if (rows[0].email){
                room8.sendMail(rows[0].email, mailerData, rows[0].forward_addresses);
              }
              res.send("Thank you for the submission");
            })

        })
        .catch((err) => {
          console.log(err);
          throw err
        });

    } catch (error) {
      console.log(error, "error: missing data");
    }

  });

  //      STRETCH FOR ADDING A NEW URL
  //   router.post("/:id", (req, res) => {
  //     knex("submissions")
  //     .insert({'answers': null, "id": uuidv4})
  //     .then(() => res.send("ANSWERS SENT"))
  //     .catch((err) => {console.log(err); throw err})
  //   });


  //get submission form where knex filter is based on submission ID
  router.get("/:id", (req, res) => {
    knex
      .select("*")
      .from("submissions")
      .join("polls", "poll_id", "=", "polls.id")
      .where('submissions.id', '=', req.params.id)
      .then((row) => {
        let templateVars = {
          question: row[0].question,
          description: row[0].description,
          options: row[0].options,
          submissionId: req.params.id
        };

        //confirmation that poll has not been already completed
        if (row[0].answers === null) {
          res.render("submission", templateVars);
        } else {
          res.render("submission_received", templateVars);
        }
      })
      .catch((err) => {
        res.render("index", err);
      })
  });

  return router;
}
